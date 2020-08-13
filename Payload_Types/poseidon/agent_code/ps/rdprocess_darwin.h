#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>

typedef void (^RDProcessEnumerator)(id process, NSString *bundleID, BOOL *stop);

@interface RDProcess : NSObject

#pragma mark Initialization with PID

- (instancetype)init __attribute__((unavailable("use -initWithPID: instead")));
/**
 * Returns a process for specified PID with following fields pre-initiated:
 * - PID value
 * - Process name (via either LaunchServices API or argv[0]-based value)
 * - Bundle ID
 * - Executable path (via either LaunchServices API or proc_pidpath() or, if nothing else, argv[0]-based value)
 *
 * @param  {(pid_t}       aPid the PID of a target process
 */
- (instancetype)initWithPID: (pid_t)aPid;

#pragma mark Creation with Bundle ID

+ (instancetype)oldestProcessWithBundleID: (NSString *)bundleID;
+ (instancetype)youngestProcessWithBundleID: (NSString *)bundleID;
+ (void)enumerateProcessesWithBundleID: (NSString *)bundleID usingBlock: (RDProcessEnumerator)block;
+ (NSArray *)allProcessesWithBundleID: (NSString *)bundleID;

- (pid_t)pid;
/**
 * A name of the process (using either LaunchServices API or argv[0]-based value)
 *
 * @return this method should not return `nil` value, but the value may be invalid any other way,
 * so it's up to you to verify it.
 */
- (NSString *)processName;
/**
 * Sets a new title for the process.
 *
 * @brief
 *     This method sets a new value for LaunchServices' "Display Name" key of the process;
 *     Please, note that some utils like `ps` or `top` rather depend on an argv[0] value than
 *     on the "Display Name".
 * @param
 *     {NSString *} new title for the process
 * @return
 *     {BOOL}       Always NO (0)
 */
- (BOOL)setProcessName: (NSString *)new_proc_name;
/**
 * These methods will return (obviously) `nil` for non-bundled applications.
 */
- (NSString *)bundleID;
- (NSURL    *)bundleURL;
- (NSString *)bundlePath;

- (NSURL    *)executableURL;
- (NSString *)executablePath;
/**
 * UID, name and full name for a user who owns this process.
 */
- (uid_t)ownerUserID;
- (NSString *)ownerUserName;
- (NSString *)ownerFullUserName;
/**
 * List of groups of which the user is member of.
 *
 * @format: Keys are groupd ids, values are groups names;
 */
- (NSDictionary *)ownerGroups;


/**
 * Check if the process is sanboxed by OS X.
 *
 * @note
 *     this method returns YES for any process with invalid PID, so you should also check if
 *     [proc sandboxContainerPath] is not nil.
 *
 * @return {BOOL} YES or NO, or neither.
 */
- (BOOL)isSandboxedByOSX;
/**
 * Sandbox container path for the process (if it has one).
 * @return
 *     {NSString *} containter path or `nil` if the process is not sandboxed.
 */
- (NSString *)sandboxContainerPath;
- (NSURL    *)sandboxContainerURL;
- (BOOL)canWriteToFileAtPath: (NSString *)file_path;
- (BOOL)canWriteToFileAtURL:  (NSURL *)file_url;
- (BOOL)canReadFileAtPath: (NSString *)file_path;
- (BOOL)canReadFileAtURL:  (NSURL *)file_url;


/**
 * ARGV and ENV values of a process
 *
 * @brief
 *     Until the current user is not a member of `procmod` group, these method will work only for
 *     processes owned by this user (for other's processes they return `nil`).
 */
- (NSArray *)launchArguments;
/* @note variable values are percent escaped */
- (NSDictionary *)environmentVariables;





/* ------------------------{ NOT IMPLEMENTED YET }------------------------ */

/**
 * More sandbox stuff
 */
- (int)_enableSandbox __attribute__((unavailable("not implemented yet")));
- (BOOL)_isSandboxedByUser __attribute__((unavailable("not implemented yet")));
// gonna crash it down
- (int)_disableSandbox __attribute__((unavailable("not implemented yet")));

// Intel
- (NSString *)architectureString __attribute__((unavailable("not implemented yet")));
// smth like "Intel (64 bit)"
- (NSString *)kindString __attribute__((unavailable("not implemented yet")));
- (BOOL)is64bit __attribute__((unavailable("not implemented yet")));


// 0-100%
- (NSUInteger)CPUUsagePercentages __attribute__((unavailable("not implemented yet")));
// msec
- (NSUInteger)CPUTimeMsec __attribute__((unavailable("not implemented yet")));

- (NSUInteger)threadsCount __attribute__((unavailable("not implemented yet")));
- (NSUInteger)activeThreadsCount __attribute__((unavailable("not implemented yet")));
- (NSUInteger)inactiveThreadsCount __attribute__((unavailable("not implemented yet")));
- (NSUInteger)openPortsCount __attribute__((unavailable("not implemented yet")));

- (NSUInteger)memoryUsageRealBytes __attribute__((unavailable("not implemented yet")));
- (NSUInteger)memoryUsageRealPrivateBytes __attribute__((unavailable("not implemented yet")));
- (NSUInteger)memoryUsageRealSharedBytes __attribute__((unavailable("not implemented yet")));
- (NSUInteger)memoryUsageVirtualPrivateBytes __attribute__((unavailable("not implemented yet")));

- (NSUInteger)messagesSent __attribute__((unavailable("not implemented yet")));
- (NSUInteger)messagesReceived __attribute__((unavailable("not implemented yet")));

@end
