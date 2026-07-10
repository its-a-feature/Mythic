import {
    faCamera,
    faCheck,
    faCirclePlus,
    faCog,
    faDatabase,
    faDownload,
    faFileArchive,
    faFileCode,
    faFileExcel,
    faFileImage,
    faFilePdf,
    faFilePowerpoint,
    faFileWord,
    faFolder,
    faFolderOpen,
    faKey,
    faList,
    faRotate,
    faSkullCrossbones,
    faSquareXmark,
    faSyringe,
    faTrashAlt,
    faUpload,
    faBoxOpen,
} from '@fortawesome/free-solid-svg-icons';

export const getIconName = (iconName) => {
    switch(`${iconName || ""}`.toLowerCase()){
        case "add": return faCirclePlus;
        case "x": return faSquareXmark;
        case "check": return faCheck;
        case "refresh": return faRotate;
        case "openfolder":
        case "folder": return faFolderOpen;
        case "closedfolder": return faFolder;
        case "archive":
        case "zip": return faFileArchive;
        case "diskimage": return faBoxOpen;
        case "executable":
        case "cog": return faCog;
        case "word": return faFileWord;
        case "excel": return faFileExcel;
        case "powerpoint": return faFilePowerpoint;
        case "pdf":
        case "adobe": return faFilePdf;
        case "database": return faDatabase;
        case "key": return faKey;
        case "code":
        case "source": return faFileCode;
        case "download": return faDownload;
        case "upload": return faUpload;
        case "png":
        case "jpg":
        case "image": return faFileImage;
        case "list": return faList;
        case "delete": return faTrashAlt;
        case "inject": return faSyringe;
        case "kill": return faSkullCrossbones;
        case "camera": return faCamera;
        default: return iconName;
    }
};
