import React from 'react';
import {snackActions} from "../utilities/Snackbar";
import {MythicStyledTooltip} from "./MythicStyledTooltip";
import {MythicDialog} from "./MythicDialog";
import {Link} from '@mui/material';
import {useMutation, useLazyQuery, gql} from '@apollo/client';
import {b64DecodeUnicode} from "../pages/Callbacks/ResponseDisplay";
import {PreviewFileMediaDialog} from "../pages/Search/PreviewFileMedia";
import {faPhotoVideo} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useMythicLazyQuery} from "../utilities/useMythicLazyQuery";

export const getfileInformationQuery = gql`
query getFileInformation($file_id: String!){
    filemeta(where: {agent_file_id: {_eq: $file_id}}){
        filename_text
    }
}
`;

export const MythicFileContext = ({agent_file_id, display_link, filename, extraStyles}) => {
    const [fileData, setFileData] = React.useState({
        agent_file_id: agent_file_id,
        display_link: display_link,
        filename: filename,
    })
    const [openPreviewMediaDialog, setOpenPreviewMediaDialog] = React.useState(false);
    const onPreviewMedia = (event) => {
        if(event){
            event.preventDefault();
            event.stopPropagation();
        }
        setOpenPreviewMediaDialog(true);
    }
    const getFileInformationSuccess = (data) => {
        setFileData( {...fileData, filename: b64DecodeUnicode(data.filemeta[0].filename_text)});
        if(display_link === "" || display_link === undefined){
            setFileData( {...fileData,
                filename: b64DecodeUnicode(data.filemeta[0].filename_text),
                display_link: b64DecodeUnicode(data.filemeta[0].filename_text)});
        }
    }
    const getFileInformationError = (data) => {
        snackActions.error("Failed to fetch instance data: " + data);
        console.log(data);
    }
    const getFileInformation = useMythicLazyQuery(getfileInformationQuery, {
        fetchPolicy: "no-cache"
    })
    React.useEffect( () => {
        if(filename === "" || filename === undefined){
            getFileInformation({variables: {file_id: fileData.agent_file_id}})
                .then(({data}) => getFileInformationSuccess(data)).catch(({data}) => getFileInformationError(data));
        }
    }, [filename]);
    return (
        <>
            <MythicStyledTooltip title={"Preview Media"} tooltipStyle={extraStyles ? extraStyles : {}}>
                <FontAwesomeIcon icon={faPhotoVideo}
                                 style={{height: "25px", bottom: "5px", position: "relative", cursor: "pointer", display: "inline-block"}}
                                 onClick={onPreviewMedia} />
            </MythicStyledTooltip>
            <Link style={{wordBreak: "break-all"}} color="textPrimary" underline="always" href={"/direct/download/" + fileData.agent_file_id}>
                {fileData.display_link === "" ? window.location.origin + "/direct/download/" + fileData.agent_file_id : fileData.display_link}
            </Link>
            {openPreviewMediaDialog &&
                <MythicDialog fullWidth={true} maxWidth="xl" open={openPreviewMediaDialog}
                              onClose={(e)=>{setOpenPreviewMediaDialog(false);}}
                              innerDialog={<PreviewFileMediaDialog
                                  agent_file_id={fileData.agent_file_id}
                                  filename={fileData.filename}
                                  onClose={(e)=>{setOpenPreviewMediaDialog(false);}} />}
                />
            }
        </>
    )
}