
export const MythicPageBody = ({children}) => {
    return (
        <div style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            margin: "0.5rem",
        }}>
            {children}
        </div>
    )
}