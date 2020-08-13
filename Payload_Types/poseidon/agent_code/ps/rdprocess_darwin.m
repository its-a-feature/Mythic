#import <grp.h>
#import <pwd.h>
#import <unistd.h>
#import <libproc.h>
#import <sys/sysctl.h>
#import <mach-o/dyld.h>
#import <sys/proc_info.h>

#import "rdprocess_darwin.h"
#import "apple_sandbox_darwin.h"


#define RDSymbolNameStr(symbol) (CFSTR("_"#symbol))
#define kPasswdBufferSize (128)
#define kSandboxContainerPathBufferSize (2024)
#define kLaunchServicesMagicConstant (-2) // or (-1), the difference is unknown

static CFTypeRef (*LSCopyApplicationInformation)(int, const void*, CFArrayRef) = NULL;
static CFTypeRef (*LSSetApplicationInformation)(int, CFTypeRef, CFDictionaryRef, void *) = NULL;
static CFTypeRef (*LSASNCreateWithPid)(CFAllocatorRef, pid_t) = NULL;

static CFStringRef (kLSDisplayNameKey) = NULL;
static CFStringRef (kLSPIDKey) = NULL;
static CFStringRef (kLSBundlePathKey) = NULL;
static CFStringRef (kLSExecutablePathKey) = NULL;

typedef NS_ENUM(NSUInteger, RDProcessForBundleIDEnumerationOption) {
	kRDProcessForBundleIDYoungest = 0,
	kRDProcessForBundleIDOldest,
	kRDProcessForBundleIDAll
};


static const CFStringRef kLaunchServicesBundleID = CFSTR("com.apple.LaunchServices");

@interface RDProcess()
{
	/* General *dynamic* info */
	pid_t _pid;
	NSString *_process_name;
	NSString *_bundle_id, *_bundle_path;
	NSString *_executable_path;
	uid_t _uid;
	NSString *_owner_user_name, *_owner_full_user_name;

	/* Sanboxing */
	BOOL _sandboxed; // sandboxed by OS X
	BOOL _sandboxed_by_user;
	NSString *_sandbox_container_path;

	/* stuff */
	NSArray *_launch_args;
	NSDictionary *_env_variables;

	/* Not implemented yet */
	NSString *kind_string;
	NSUInteger cpu_usage, cpu_time_msec;
	NSUInteger threads_count, open_ports_count;
	NSUInteger memory_real_bytes, memory_real_private_bytes,
	           memory_real_shared_bytes, memory_virtual_private_bytes;
	NSUInteger messages_sent, messages_received;

	NSLock *lock;
}
+ (BOOL)_checkIfWeCanAccessPIDAtTheMoment: (pid_t)a_pid;
+ (NSArray *)_lookupForProcessesWithBundleID: (NSString *)bundleID options: (RDProcessForBundleIDEnumerationOption)option;

- (void)_requestOwnerNames;
- (BOOL)_requestProcessArgumentsAndEnvironment;
- (BOOL)_checkSandboxOperation: (const char *)operation forItemAtPath: (NSString *)item_path;

- (BOOL)_findLSPrivateSymbols;
- (void)_fetchNewDataFromLaunchServicesWithAtLeastOneKey: (CFStringRef)key;
- (void)_updateWithLSDictionary: (CFDictionaryRef)dictionary;
@end

@implementation RDProcess


- (instancetype)initWithPID: (pid_t)a_pid
{
	BOOL pid_is_available = [[self class] _checkIfWeCanAccessPIDAtTheMoment: a_pid];
	if (NO == pid_is_available) {
		return (nil);
	}
	if ((self = [super init])) {
		_pid = a_pid;
		_uid = -1;
		_owner_user_name = nil;
		_owner_full_user_name = nil;

		[self _fetchNewDataFromLaunchServicesWithAtLeastOneKey: NULL];
	}

	return (self);
}

+ (instancetype)oldestProcessWithBundleID: (NSString *)bundleID
{
	return [[self _lookupForProcessesWithBundleID: bundleID option: kRDProcessForBundleIDOldest] lastObject];
}

+ (instancetype)youngestProcessWithBundleID: (NSString *)bundleID
{
	return [[self _lookupForProcessesWithBundleID: bundleID option: kRDProcessForBundleIDYoungest] lastObject];
}

+ (void)enumerateProcessesWithBundleID: (NSString *)bundleID usingBlock: (RDProcessEnumerator)block
{
	if (!block) {
		return;
	}
	NSArray *procs = [self allProcessesWithBundleID: bundleID];
	if (!procs) {
		return;
	}
	[procs enumerateObjectsUsingBlock: ^(id process, NSUInteger idx, BOOL *stop){
		block(process, bundleID, stop);
	}];
}

+ (NSArray *)allProcessesWithBundleID: (NSString *)bundleID
{
	return [self _lookupForProcessesWithBundleID: bundleID option: kRDProcessForBundleIDAll];
}

+ (BOOL)_checkIfWeCanAccessPIDAtTheMoment: (pid_t)a_pid
{
	if (a_pid < 0) return NO;
	/**
	 * kill(0) here is an indicator that we have a process with
	 * such PID and can access it.
	 */
	int err = kill(a_pid, 0);
	switch (err) {
		case (-1): {
			//NSLog(@"Could not access pid (%d)", a_pid);
			return (errno != ESRCH);
		}
		case (0): {
			return YES;
		}
		default: {
			//NSLog(@"Pid %d doesn't exist", a_pid);
			return NO;
		}
	}
}

+ (NSArray *)_lookupForProcessesWithBundleID: (NSString *)bundleID option: (RDProcessForBundleIDEnumerationOption)option
{
	if (bundleID.length == 0) {
		return (nil);
	}

	ProcessSerialNumber psn = {0, kNoProcess};
	UInt32 oldest_proc_launch_date   = UINT32_MAX,
	       youngest_proc_launch_date = 0;

	NSMutableArray *procs = nil;
	BOOL find_youngest = (option == kRDProcessForBundleIDYoungest);
	BOOL find_oldest   = (option == kRDProcessForBundleIDOldest);
	pid_t target_pid   = (-1);
	BOOL find_all      = !(find_youngest || find_oldest);
	if (find_all) {
		procs = [[NSMutableArray alloc] init];
	}
	/**
	 * Seems like the only *public* way to iterate over all running processes is GetNextProcess()
	 * which is a simple wrapper for LSCopyRunningApplicationArray().
	 *
	 * So, @todo: use LSCopyRunningApplicationArray() directly.
	 */
	while (KERN_SUCCESS == GetNextProcess(&psn)) {
		struct ProcessInfoRec info = {0};
		info.processInfoLength = sizeof(&info);
		int err = GetProcessInformation(&psn, &info);
		if (err != KERN_SUCCESS) {
			//NSLog(@"GetProcessInformation returned %d: %@",
				//err, [NSError errorWithDomain: NSOSStatusErrorDomain code: err userInfo: nil]);
			continue;
		}

		pid_t pid = 0;
		GetProcessPID(&psn, &pid);
		CFTypeRef asn = LSASNCreateWithPid(kCFAllocatorDefault, pid);

		CFDictionaryRef proc_info = LSCopyApplicationInformation(kLaunchServicesMagicConstant, asn, NULL);
		CFRelease(asn);
		if (!proc_info) {
			continue;
		}

		CFStringRef found_bundle_id = CFDictionaryGetValue(proc_info, kCFBundleIdentifierKey);
		if (!found_bundle_id) {
			CFRelease(proc_info);
			continue;
		}
		BOOL (^checkIfBundleIDMatches)(CFStringRef, CFStringRef) = ^BOOL(CFStringRef a, CFStringRef b) {
			return (CFStringCompare(a, b, 0) == kCFCompareEqualTo);
		};

		if (find_oldest && info.processLaunchDate < oldest_proc_launch_date) {
            if (checkIfBundleIDMatches(found_bundle_id, (CFStringRef)CFBridgingRetain(bundleID))) {
				oldest_proc_launch_date = info.processLaunchDate;
				target_pid = pid;
			}
		}
		if (find_youngest && info.processLaunchDate > youngest_proc_launch_date) {
            if (checkIfBundleIDMatches(found_bundle_id, (CFStringRef)CFBridgingRetain(bundleID))) {
				youngest_proc_launch_date = info.processLaunchDate;
				target_pid = pid;
			}
		}
		if (find_all) {
            if (checkIfBundleIDMatches(found_bundle_id, (CFStringRef)CFBridgingRetain(bundleID))) {
				[procs addObject: [[RDProcess alloc] initWithPID: pid]];
			}
		}

		CFRelease(proc_info);
	}

	if (find_all) {
		NSArray *result = [NSArray arrayWithArray: procs];
		
		return (result);

	} else {
		if (target_pid == (-1)) {
			return nil;
		} else {
			return @[[[RDProcess alloc] initWithPID: target_pid]];
		}
	}
}

- (NSString *)description
{
	return [NSString stringWithFormat: @"<%@: %@ (%@/%d) owned by %@ (%d)>",
		NSStringFromClass([self class]), self.processName, self.bundleID, self.pid,
		self.ownerUserName, self.ownerUserID];
}

- (NSString *)processName
{
	if (!_process_name) {
		[self _fetchNewDataFromLaunchServicesWithAtLeastOneKey: kLSDisplayNameKey];

		if (!_process_name) {
			_process_name = [self.executablePath lastPathComponent];
		}
	}

	return _process_name;
}

- (BOOL)setProcessName: (NSString *)new_proc_name
{
	if (self.processName.length == 0 || new_proc_name.length == 0) {
		return NO;
	}
	CFDictionaryRef tmp_dict = CFDictionaryCreate(kCFAllocatorDefault,
		(const void **)&kLSDisplayNameKey, (const void *)&new_proc_name,
		1,
		&kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);

	LSSetApplicationInformation(kLaunchServicesMagicConstant,
		LSASNCreateWithPid(kCFAllocatorDefault, self.pid),
		tmp_dict,
		NULL);
	CFRelease(tmp_dict);
	/* Force updating the process name value via LaunchServices */
	[self _fetchNewDataFromLaunchServicesWithAtLeastOneKey: kLSDisplayNameKey];

	return NO;
}

- (pid_t)pid
{
	/**
	 * I'm not sure
	 * 1) if PID is likely to change during a process lifetime and
	 * 2) if we should ask LS for a PID every time this method gets called;
	 *
	 * @todo: make sure about both points above.
	 */
	[self _fetchNewDataFromLaunchServicesWithAtLeastOneKey: kLSPIDKey];

	return _pid;
}

- (NSString *)bundleID
{
	if (!_bundle_id) {
		[self _fetchNewDataFromLaunchServicesWithAtLeastOneKey: kCFBundleIdentifierKey];
		if (!_bundle_id && _executable_path) {
			/* Maybe we have a bundle even if Launch Services said no? */
			NSString *path = [_executable_path stringByDeletingLastPathComponent]; // remove executable name
			path = [path stringByReplacingOccurrencesOfString: @"/Contents/MacOS" withString: @""];
			NSBundle *lasthope = [NSBundle bundleWithPath: path];
			_bundle_id = [lasthope bundleIdentifier];

			/* Let's also fix the bundle path */
			if (!_bundle_path) {
				_bundle_path = path;
			}
		}
	}

	return _bundle_id;
}

- (NSURL *)bundleURL
{
	if (!self.bundlePath) {
		return (nil);
	}

	return [NSURL fileURLWithPath: self.bundlePath];
}

- (NSString *)bundlePath
{
	if (!_bundle_path) {
		[self _fetchNewDataFromLaunchServicesWithAtLeastOneKey: kLSBundlePathKey];
	}

	return _bundle_path;
}

- (NSURL *)executableURL
{
	if (!self.executablePath) {
		return (nil);
	}
	return [NSURL fileURLWithPath: self.executablePath];
}

- (NSString *)executablePath
{
	if (!_executable_path) {
		/* First we ask LaunchServies API */
		[self _fetchNewDataFromLaunchServicesWithAtLeastOneKey: kLSExecutablePathKey];
		/* If it fails, ask for argv[0] */
		if (!_executable_path) {
			_executable_path = [self.launchArguments objectAtIndex: 0];
		}
		/* If argv[0] doesn't exist (which is unlikely to happen, but anyway), use `proc_pidpath()`*/
		if (!_executable_path) {
			char *buf = malloc(sizeof(*buf) * kSandboxContainerPathBufferSize);
			int err = proc_pidpath(self.pid, buf, kSandboxContainerPathBufferSize);
			if (err) {
				_executable_path = [NSString stringWithUTF8String: buf];
			}
			free(buf);
		}
	}

	return _executable_path;
}

- (uid_t)ownerUserID
{
	if (_uid == -1) {
		pid_t current_pid = self.pid;
		struct kinfo_proc process_info;
		int ctl_args[4] = {
			CTL_KERN, KERN_PROC, KERN_PROC_PID, current_pid
		};
		size_t info_size = sizeof(process_info);
		int err = sysctl(ctl_args, 4, &process_info, &info_size, NULL, 0);
		if (err == KERN_SUCCESS && info_size > 0) {
			_uid = process_info.kp_eproc.e_ucred.cr_uid;
		}
	}
	return _uid;
}


- (void)_requestOwnerNames
{
	if (_owner_user_name && _owner_full_user_name) {
		return;
	}

	struct passwd user_data, *tmp = NULL;
	uid_t user_id = [self ownerUserID];
	if (user_id == -1) {
		return;
	}
	char* buffer = malloc(sizeof(*buffer) * kPasswdBufferSize);
	int err = getpwuid_r(user_id, &user_data, buffer, kPasswdBufferSize, &tmp);
	if (err != KERN_SUCCESS) {
		free(buffer);
		return;
	}

	_owner_full_user_name = [[NSString stringWithUTF8String: user_data.pw_gecos] copy];
	_owner_user_name      = [[NSString stringWithUTF8String: user_data.pw_name] copy];

	free(buffer);
}

- (NSString *)ownerUserName
{
	[self _requestOwnerNames];
	return (_owner_user_name);
}

- (NSString *)ownerFullUserName
{
	[self _requestOwnerNames];
	return (_owner_full_user_name);
}

- (NSDictionary *)ownerGroups
{
	NSDictionary *result = nil;

	int ngroups = NGROUPS_MAX;
	int *gr_bytes = malloc(sizeof(*gr_bytes) * ngroups);
	const char *user_name = [self.ownerUserName UTF8String];
	if (!user_name) {
		return result;
	}
	getgrouplist(user_name, 12, gr_bytes, &ngroups);
	if (ngroups == 0) {
		 /* will it ever happen? */
		return result;
	}

	NSMutableDictionary *tmp_dict = [[NSMutableDictionary alloc] initWithCapacity: ngroups];
	for (int i = 0; i < ngroups; i++) {
		struct group *some_group = getgrgid(gr_bytes[i]);
		if (!some_group) { continue; }
		[tmp_dict setObject: [NSString stringWithUTF8String: some_group->gr_name]
			forKey: [NSNumber numberWithUnsignedInt: gr_bytes[i]]];
	}

	result = [NSDictionary dictionaryWithDictionary: tmp_dict];
	free(gr_bytes);
	return result;
}


#pragma mark
#pragma mark Inspecting process
#pragma mark


- (BOOL)_requestProcessArgumentsAndEnvironment
{
	/* Max size of arguments (KERN_ARGMAX) */
	int request_argmax[2] = {
		CTL_KERN, KERN_ARGMAX
	};

	int argmax = 0;
	size_t size = sizeof(argmax);
	int err = sysctl(request_argmax, 2, &argmax, &size, NULL, 0);
	if (err != KERN_SUCCESS) {
		//NSLog(@"[%d] sysctl failed in method %s", __LINE__, __PRETTY_FUNCTION__);
		return (NO);
	}

	/* Request arguments pointer */
	uint8_t *arguments = malloc(argmax);
	if (!arguments) {
		return (NO);
	}

	pid_t current_pid = self.pid;
	int request_args[3] = {
		CTL_KERN, KERN_PROCARGS2, current_pid
	};
	size = argmax;
	err = sysctl(request_args, 3, arguments, &size, NULL, 0);
	if (err != KERN_SUCCESS) {
		free(arguments);
		//NSLog(@"[%d] sysctl failed in method %s", __LINE__, __PRETTY_FUNCTION__);
		return (NO);
	}

	int argc = *arguments;
	int counter = 0;
	uint8_t *arguments_ptr = arguments;
	// skip `argc`
	arguments += sizeof(argc);
	// skip `exec_path` which is a duplicate of argv[0]
	arguments += strlen((const char *)arguments);

	if (argc <= 0) {
		free(arguments_ptr);
		//NSLog(@"argc <= 0; weird :(");
		return (NO);
	}

	NSMutableArray *tmp_argv = [[NSMutableArray alloc] initWithCapacity: argc];
	NSMutableDictionary *tmp_env = [[NSMutableDictionary alloc] init];
	for (int i = 0; i < size;) {
		if ((*(arguments+i)) == '\0') {
			i++;
		}
		const char *arg = (const char *)(arguments+i);
		if (strlen(arg) > 0) {
			if (counter < argc) {
				[tmp_argv addObject: [NSString stringWithUTF8String: arg]];

			} else {
			/* Parse env vars */
			NSArray *parts = [[NSString stringWithUTF8String: arg]
				componentsSeparatedByString: @"="];
			/**
			 * Sometimes environment variable pair contains only the key, so
			 * let's handle it correctly.
			 */
			NSString *value = (parts.count > 1) ? parts[1] : @"";
			[tmp_env setObject: [value stringByAddingPercentEscapesUsingEncoding: NSUTF8StringEncoding]
			            forKey: parts[0]];
			}
			++counter;
			i += strlen(arg);
		} else {
			i++;
		}
	}
	if (_launch_args) {
		//[_launch_args release];
	}
	_launch_args = [[NSArray alloc] initWithArray: tmp_argv copyItems: NO];
	//[tmp_argv release];

	if (_env_variables) {
		//[_env_variables release];
	}
	_env_variables = [[NSDictionary alloc] initWithDictionary: tmp_env];
	//[tmp_env release];

	free(arguments_ptr);

	return (YES);
}

- (NSArray *)launchArguments
{
	if (!_launch_args) {
		[self _requestProcessArgumentsAndEnvironment];
	}

	return (_launch_args);
}

- (NSDictionary *)environmentVariables
{
	if (!_env_variables) {
		[self _requestProcessArgumentsAndEnvironment];
	}

	return (_env_variables);
}


#pragma mark
#pragma mark Sandbox
#pragma mark

/**
 * Returns YES if a proccess is living in Sandbox environment.
 *
 * NOTE: this may return wrong result if the process was sandboxed by user, not by OS X.
 * Use `_isSandboxedByUser` to make sure you get corrent results;
 *
 * NOTE: this method also returns YES for any process with *invalid* PID, so it may be
 * better to check if `-sandboxContainerPath` is not equal to `nil` to find out that
 * the process is actually sandboxed.
 */
- (BOOL)isSandboxedByOSX
{
	static pid_t old_pid = -1;
	pid_t new_pid = self.pid;
	if (old_pid != new_pid) {
		old_pid = new_pid;
		_sandboxed = sandbox_check(self.pid, NULL, SANDBOX_FILTER_NONE);
	}

	return (_sandboxed);
}

- (NSString *)sandboxContainerPath
{
	if (!_sandbox_container_path) {
		char *buf = malloc(sizeof(*buf) * kSandboxContainerPathBufferSize);
		int err = sandbox_container_path_for_pid(_pid, buf, kSandboxContainerPathBufferSize);
		if (err == KERN_SUCCESS && strlen(buf) > 0) {
			_sandbox_container_path = [NSString stringWithUTF8String: buf];
		}

		free(buf);
	}

	return (_sandbox_container_path);
}

- (NSURL *)sandboxContainerURL
{
	return [NSURL fileURLWithPath: self.sandboxContainerPath];
}

- (BOOL)_checkSandboxOperation: (const char *)operation forItemAtPath: (NSString *)item_path
{
	BOOL result = NO;
	if (strlen(operation) == 0 || item_path.length == 0) {
		return result;
	}

	result = (KERN_SUCCESS == sandbox_check(self.pid, operation,
		(SANDBOX_FILTER_PATH | SANDBOX_CHECK_NO_REPORT), [item_path UTF8String]));

	return (result);
}

/* @todo: "job-creation", anyone? */

- (BOOL)canReadFileAtPath: (NSString *)file_path
{
	return [self _checkSandboxOperation: "file-read-data" forItemAtPath: file_path];
}

- (BOOL)canReadFileAtURL: (NSURL *)file_url
{
	return [self canReadFileAtPath: [file_url path]];
}

- (BOOL)canWriteToFileAtPath: (NSString *)file_path
{
	return [self _checkSandboxOperation: "file-write-data" forItemAtPath: file_path];
}

- (BOOL)canWriteToFileAtURL: (NSURL *)file_url
{
	return [self canWriteToFileAtPath: [file_url path]];
}

/**
 * Enable or disable(?) custom sanbox for the process.
 */
#pragma mark Custom Sandboxing

/**
 * to be implemented
 * @return {int} [description]
 */
- (int)_enableSandbox
{
	if ([self isSandboxedByOSX]) {
		return KERN_FAILURE;
	}
	if ([self _isSandboxedByUser]) {
		return KERN_SUCCESS;
	}
	return KERN_FAILURE;
}

/**
 * to be implemented
 * @return {int} [description]
 */
- (BOOL)_isSandboxedByUser
{
	return NO;
}
/**
 * to be implemented
 * @return {int} [description]
 */
- (int)_disableSandbox
{
	return KERN_FAILURE;
}



#pragma mark
#pragma mark LaunchServices Magic
#pragma mark

- (void)_fetchNewDataFromLaunchServicesWithAtLeastOneKey: (CFStringRef)key
{
	[lock lock];
	if (!LSCopyApplicationInformation) {
		if ( ! [self _findLSPrivateSymbols]) {
			goto done;
		}
	}

	CFArrayRef request_array = NULL;
	if (key) {
		request_array = CFArrayCreate(NULL, (const void **)key, 1, NULL);
	}

	CFDictionaryRef ls_update = LSCopyApplicationInformation(kLaunchServicesMagicConstant, LSASNCreateWithPid(NULL, _pid), request_array);
	if (!ls_update) {
		goto done;
	}

	[self _updateWithLSDictionary: ls_update];
	CFRelease(ls_update);

done: {
	[lock unlock];
	return;
}
}

- (void)_updateWithLSDictionary: (CFDictionaryRef)dictionary
{
	CFTypeRef tmp = NULL;
	if (CFDictionaryGetValueIfPresent(dictionary, kLSPIDKey, &tmp)) {
		CFNumberGetValue(tmp, kCFNumberIntType, &_pid);
	}
	tmp = NULL;
	if (CFDictionaryGetValueIfPresent(dictionary, kLSDisplayNameKey, &tmp)) {
		//if (_process_name) [_process_name release];
        _process_name = [NSString stringWithString: CFBridgingRelease(tmp)];
	}
	tmp = NULL;
	if (CFDictionaryGetValueIfPresent(dictionary, kCFBundleIdentifierKey, &tmp)) {
		//if (_bundle_id) [_bundle_id release];
        _bundle_id = [NSString stringWithString: CFBridgingRelease(tmp)];
	}
	tmp = NULL;
	if (CFDictionaryGetValueIfPresent(dictionary, kLSBundlePathKey, &tmp)) {
		//if (_bundle_path) [_bundle_path release];
        _bundle_path = [NSString stringWithString: CFBridgingRelease(tmp)];
	}
	tmp = NULL;
	if (CFDictionaryGetValueIfPresent(dictionary, kLSExecutablePathKey, &tmp)) {
		//if (_executable_path) [_executable_path release];
        _executable_path = [NSString stringWithString: CFBridgingRelease(tmp)];
	}
}


- (BOOL)_findLSPrivateSymbols
{

	CFBundleRef launch_services_bundle = CFBundleGetBundleWithIdentifier(kLaunchServicesBundleID);
	if (!launch_services_bundle) { return NO; }

	LSCopyApplicationInformation = CFBundleGetFunctionPointerForName(launch_services_bundle, RDSymbolNameStr(LSCopyApplicationInformation));
	if (!LSCopyApplicationInformation) { return NO; }
	// NSLog(@"LSCopyApplicationInformation = %p", LSCopyApplicationInformation);

	LSASNCreateWithPid = CFBundleGetFunctionPointerForName(launch_services_bundle, RDSymbolNameStr(LSASNCreateWithPid));
	if (!LSASNCreateWithPid) { return NO; }
	// NSLog(@"LSASNCreateWithPid = %p", LSASNCreateWithPid);

	LSSetApplicationInformation = CFBundleGetFunctionPointerForName(launch_services_bundle, RDSymbolNameStr(LSSetApplicationInformation));
	if (!LSSetApplicationInformation) { return NO; }

	kLSDisplayNameKey = *(CFStringRef *)CFBundleGetDataPointerForName(launch_services_bundle, RDSymbolNameStr(kLSDisplayNameKey));
	if (!kLSDisplayNameKey) { return NO; }
	// NSLog(@"kLSDisplayNameKey = %p (%@)", kLSDisplayNameKey, (id)kLSDisplayNameKey);

	kLSPIDKey = *(CFStringRef *)CFBundleGetDataPointerForName(launch_services_bundle, RDSymbolNameStr(kLSPIDKey));
	if (!kLSPIDKey) { return NO; }
	// NSLog(@"kLSPIDKey = %p (%@)", kLSPIDKey, (id)kLSPIDKey);

	kLSBundlePathKey = *(CFStringRef *)CFBundleGetDataPointerForName(launch_services_bundle, RDSymbolNameStr(kLSBundlePathKey));
	if (!kLSBundlePathKey) { return NO; }
	// NSLog(@"kLSBundlePathKey = %p (%@)", kLSBundlePathKey, (id)kLSBundlePathKey);

	kLSExecutablePathKey = *(CFStringRef *)CFBundleGetDataPointerForName(launch_services_bundle, RDSymbolNameStr(kLSExecutablePathKey));
	if (!kLSExecutablePathKey) { return NO; }
	// NSLog(@"kLSExecutablePathKey = %p (%@)", kLSExecutablePathKey, (id)kLSExecutablePathKey);


	/******************************************************/
	return YES;
}
@end
