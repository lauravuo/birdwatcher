import {
    type ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import {
    type User,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

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
        // DEV ONLY: Check for debug user flag
        if (import.meta.env.DEV) {
            const debugUser = localStorage.getItem("birdwatcher_debug_user");
            if (debugUser) {
                setCurrentUser({
                    displayName: "Debug User",
                    email: "debug@test.com",
                } as User);
                setLoading(false);
                return;
            }
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
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
