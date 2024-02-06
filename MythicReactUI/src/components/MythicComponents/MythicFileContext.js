import React from 'react';
import {previewFileQuery} from "../pages/Search/FileMetaTable";
import {snackActions} from "../utilities/Snackbar";
import {MythicStyledTooltip} from "./MythicStyledTooltip";
import hexFile from "../../assets/file_bin.png";
import txtFile from "../../assets/file_txt.png";
import {MythicDialog} from "./MythicDialog";
import {PreviewFileStringDialog} from "../pages/Search/PreviewFileStringDialog";
import {PreviewFileHexDialog} from "../pages/Search/PreviewFileHexDialog";
import {Link} from '@mui/material';
import {useMutation, useLazyQuery, gql} from '@apollo/client';
import {b64DecodeUnicode} from "../pages/Callbacks/ResponseDisplay";

export const getfileInformationQuery = gql`
query getFileInformation($file_id: String!){
    filemeta(where: {agent_file_id: {_eq: $file_id}}){
        filename_text
    }
}
`;

export const MythicFileContext = ({agent_file_id, display_link, filename}) => {
    const [fileData, setFileData] = React.useState({
        agent_file_id: agent_file_id,
        display_link: display_link,
        filename: filename,
    })
    const [openPreviewStringsDialog, setOpenPreviewStringsDialog] = React.useState(false);
    const [openPreviewHexDialog, setOpenPreviewHexDialog] = React.useState(false);
    const [fileContents, setFileContents] = React.useState('');
    const [previewFileString] = useMutation(previewFileQuery, {
        onCompleted: (data) => {
            if(data.previewFile.status === "success"){
                setFileContents(data.previewFile.contents);
                setOpenPreviewStringsDialog(true);
            }else{
                snackActions.error(data.previewFile.error)
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error(data);
        }
    });
    const [previewFileHex] = useMutation(previewFileQuery, {
        onCompleted: (data) => {
            if(data.previewFile.status === "success"){
                setFileContents(data.previewFile.contents);
                setOpenPreviewHexDialog(true);
            }else{
                snackActions.error(data.previewFile.error)
            }
        },
        onError: (data) => {
            console.log(data);
            snackActions.error(data);
        }
    });
    const onPreviewStrings = (event) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        previewFileString({variables: {file_id: fileData.agent_file_id}})
    }
    const onPreviewHex = (event) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        previewFileHex({variables: {file_id: fileData.agent_file_id}})
    }
    const [getFileInformation] = useLazyQuery(getfileInformationQuery, {
        onCompleted: (data) => {
            setFileData( {...fileData, filename: b64DecodeUnicode(data.filemeta[0].filename_text)});
            if(display_link === "" || display_link === undefined){
                setFileData( {...fileData,
                    filename: b64DecodeUnicode(data.filemeta[0].filename_text),
                    display_link: b64DecodeUnicode(data.filemeta[0].filename_text)});
            }
        },
        onError: (data) => {
            snackActions.error("Failed to fetch instance data: " + data);
            console.log(data);
        },
        fetchPolicy: "no-cache"
    })
    React.useEffect( () => {
        if(filename === "" || filename === undefined){
            getFileInformation({variables: {file_id: fileData.agent_file_id}})
        }
    }, [filename]);
    return (
        <>
            <MythicStyledTooltip title={"Preview HEX XXD"}>
                <img src={hexFile} alt={"preview hex"} style={{height: "35px", cursor: "pointer"}}
                     onClick={onPreviewHex}/>
            </MythicStyledTooltip>
            <MythicStyledTooltip title={"Preview Strings"}>
                <img src={txtFile} alt={"preview strings"} style={{height: "35px", cursor: "pointer"}}
                     onClick={onPreviewStrings} />
            </MythicStyledTooltip>
            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + fileData.agent_file_id}>
                {fileData.display_link === "" ? window.location.origin + "/direct/download/" + fileData.agent_file_id : fileData.display_link}
            </Link>
            {openPreviewStringsDialog &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewStringsDialog}
                              onClose={()=>{setOpenPreviewStringsDialog(false);}}
                              innerDialog={<PreviewFileStringDialog onClose={()=>{setOpenPreviewStringsDialog(false);}}
                                                                    filename={fileData.filename} contents={fileContents}
                              />}
                />
            }
            {openPreviewHexDialog &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewHexDialog}
                              onClose={()=>{setOpenPreviewHexDialog(false);}}
                              innerDialog={<PreviewFileHexDialog onClose={()=>{setOpenPreviewHexDialog(false);}}
                                                                 filename={fileData.filename} contents={fileContents}
                              />}
                />
            }
        </>
    )
}