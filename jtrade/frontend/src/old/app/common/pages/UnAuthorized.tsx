import {Link} from "react-router-dom";

export default function UnauthorizedPage() {
    return (
        <div className="container" style={{paddingTop: 48, paddingBottom: 48}}>
            <div className="auth-card" style={{textAlign: "center"}}>
                <div className="badge badge-yellow">ACCESS</div>
                <h2 className="h2 mt-3">Unauthorized</h2>
                <p className="muted mt-2">
                    No tienes permisos para ver esta sección.
                </p>
                <div className="row" style={{justifyContent: "center", marginTop: 16, gap: 12}}>
                    <Link to="/" className="btn btn-outline">Home</Link>
                    <Link to="/signin" className="btn btn-solid">Sign in</Link>
                </div>
            </div>
        </div>
    );
}