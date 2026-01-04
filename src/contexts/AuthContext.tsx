import {
	onAuthStateChanged,
	signInWithPopup,
	signOut,
	type User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { auth, db, googleProvider } from "../lib/firebase";

interface AuthContextType {
	currentUser: User | null;
	loading: boolean;
	login: () => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within an AuthProvider");
	return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				// Ensure user profile is synced with Firestore
				try {
					await setDoc(
						doc(db, "users", user.uid),
						{
							id: user.uid,
							displayName: user.displayName || "Anonymous",
							email: user.email || "",
							photoURL: user.photoURL || null,
						},
						{ merge: true },
					);
				} catch (err) {
					console.error("Failed to sync user profile:", err);
				}
			}
			setCurrentUser(user);
			setLoading(false);
		});
		return unsubscribe;
	}, []);

	const login = async () => {
		await signInWithPopup(auth, googleProvider);
	};

	const logout = async () => {
		await signOut(auth);
	};

	const value = {
		currentUser,
		loading,
		login,
		logout,
	};

	return (
		<AuthContext.Provider value={value}>
			{!loading && children}
		</AuthContext.Provider>
	);
}
