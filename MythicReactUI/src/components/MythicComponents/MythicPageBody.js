
export const MythicPageBody = ({children}) => {
    return (
        <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "0.5rem",
            gap: "0.2rem",
            minWidth: 0,
            minHeight: 0,
        }}>
            {children}
        </div>
    )
}
