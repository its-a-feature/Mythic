import React from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {isAllowedMarkdownLink} from "./Markdown";

const markdownTableAlignments = ["left", "right", "center"];
const getMarkdownTableAlign = (align) => markdownTableAlignments.includes(align) ? align : "left";

const MarkdownHeading = ({level, children}) => (
    <Typography component={`h${level}`} className={`mythic-chat-heading mythic-chat-heading-${level}`}>
        {children}
    </Typography>
);

export const markdownComponents = {
    p: ({children}) => <Typography component="p" className="mythic-chat-paragraph">{children}</Typography>,
    h1: ({children}) => <MarkdownHeading level={1}>{children}</MarkdownHeading>,
    h2: ({children}) => <MarkdownHeading level={2}>{children}</MarkdownHeading>,
    h3: ({children}) => <MarkdownHeading level={3}>{children}</MarkdownHeading>,
    h4: ({children}) => <MarkdownHeading level={4}>{children}</MarkdownHeading>,
    h5: ({children}) => <MarkdownHeading level={5}>{children}</MarkdownHeading>,
    h6: ({children}) => <MarkdownHeading level={6}>{children}</MarkdownHeading>,
    ul: ({children}) => <ul className="mythic-chat-list">{children}</ul>,
    ol: ({children}) => <ol className="mythic-chat-list">{children}</ol>,
    blockquote: ({children}) => <Box component="blockquote" className="mythic-chat-blockquote">{children}</Box>,
    hr: () => <hr className="mythic-chat-rule" />,
    table: ({children}) => (
        <TableContainer className="mythicElement mythic-chat-table-wrap">
            <Table className="mythic-chat-table" size="small">{children}</Table>
        </TableContainer>
    ),
    thead: ({children}) => <TableHead>{children}</TableHead>,
    tbody: ({children}) => <TableBody>{children}</TableBody>,
    tr: ({children}) => <TableRow hover>{children}</TableRow>,
    th: ({children, align}) => <TableCell component="th" scope="col" align={getMarkdownTableAlign(align)}>{children}</TableCell>,
    td: ({children, align}) => <TableCell align={getMarkdownTableAlign(align)}>{children}</TableCell>,
    pre: ({children}) => {
        let language = "";
        React.Children.forEach(children, (child) => {
            const className = child?.props?.className || "";
            const match = className.match(/language-([^ ]+)/);
            if(match){
                language = match[1];
            }
        });
        return (
            <Box className="mythic-chat-code-block">
                {language && <span className="mythic-chat-code-language">{language}</span>}
                <pre>{children}</pre>
            </Box>
        );
    },
    code: ({className, children}) => (
        <code className={className || "mythic-chat-inline-code"}>{children}</code>
    ),
    a: ({href, children}) => {
        if(!isAllowedMarkdownLink(href)){
            return children;
        }
        return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    },
};
