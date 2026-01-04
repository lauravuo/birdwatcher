import { useAuth } from "../contexts/AuthContext";

export function Login() {
	const { login } = useAuth();

	return (
		<div className="login-container">
			<h1>Birdwatcher</h1>
			<p>Please sign in to continue.</p>
			<button type="button" onClick={login}>
				Sign in with Google
			</button>
		</div>
	);
}
