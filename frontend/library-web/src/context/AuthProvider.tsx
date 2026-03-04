// import { useNavigate } from "react-router-dom";
// import {createContext, useCallback, useState, type ReactNode } from "react";
// import { useQueryClient } from "@tanstack/react-query";

// type UserRole = "ADMIN" | "LIBRARIAN";
// interface IUser {
//     role: UserRole;
//     id: number;
//     name: string;
//     email: string;
//     password: string;
// }

// const mockedAdmin = {
//     role: "ADMIN",
//     id: 1,
//     name: "admin",
//     email: "admin@admin.pl",
//     password: "asdf1234"
// }
// const moickedLibrarian = {
//     role: "LIBRARIAN",
//     id: 2,
//     name: "librarian",
//     email: "librarian@librarian.pl",
//     password: "asdf1234"
// }
// interface AuthContextType {
//     user: IUser | null;
//     role: UserRole,
//     isLoading: boolean;
//     token: string | null;
//     // login: (token: string) => Promise<IUser>;
//     // logout: () => void;
    
//     mockedLogin: (token: string) => Promise<IUser>;
//     mockedLogout: () => void;

//     canAccess: (path: string) => boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const AuthProvider = ({children}: {children: ReactNode}) => {
//     const navigate = useNavigate();
//     const [user, setUser] = useState<IUser | null>(null);

//     const [token, setToken] = useState<string | null>(() => {
//         return localStorage.getItem("access-token")
//     });

//     const role = (user?.role as UserRole) || null;

//     const mockedLogout = useCallback(() => {
//         localStorage.removeItem("access-token");
//         setUser(null);
//         setToken(null);
//         navigate("/signin");
//     }, [navigate])

//     const mockedLogin = (token: string) => {
//         if (token === "admin_token") {

//         } else {

//         }
//     }

//     return (
//         <AuthContext.Provider 
//         value={{
//             user: user || null,
//             role,
//             mockedLogout,

//         }}>
//             {children}
//         </AuthContext.Provider>
//     )
// }