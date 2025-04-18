/* Alchemical‑Dictionaries – App shell
   ----------------------------------- */
   import { useEffect, useState } from "react";
   import {
     BrowserRouter,
     Routes,
     Route,
     NavLink,
     Navigate,
   } from "react-router-dom";
   import DataStore from "./lib/dataStore.js";
   
   import SearchView from "./views/SearchView.jsx";
   import SymbolsView from "./views/SymbolsView.jsx";
   import EntryView from "./views/EntryView.jsx";
   import FacsimileView from "./views/FacsimileView.jsx";
   
   /* ⬇ base styling for existing badges etc. */
   import "./components/badge.css";
   
   export default function App() {
     const [ready, setReady] = useState(false);
   
     useEffect(() => {
       DataStore.ready()
         .then(() => {
           console.info("[App] DataStore ready");
           setReady(true);
         })
         .catch(console.error);
     }, []);
   
     if (!ready) {
       return (
         <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
           <h1>Alchemical‑Dictionaries</h1>
           <p>Loading data…</p>
         </div>
       );
     }
   
     return (
       <BrowserRouter basename={import.meta.env.BASE_URL}>
         <header style={styles.header}>
           <h1 style={{ margin: "0 1rem 0 0" }}>Alchemical‑Dictionaries</h1>
   
           <nav style={styles.nav}>
             <NavLink to="/search" style={styles.link}>
               Search
             </NavLink>
             <NavLink to="/symbols" style={styles.link}>
               Symbols
             </NavLink>
           </nav>
         </header>
   
         <main style={{ padding: "1rem" }}>
           <Routes>
             <Route path="/" element={<Navigate to="/search" replace />} />
             <Route path="/search" element={<SearchView />} />
             <Route path="/symbols" element={<SymbolsView />} />
             <Route path="/entry/:id" element={<EntryView />} />
             <Route path="/facsimiles/:img" element={<FacsimileView />} />
             <Route path="*" element={<h2>Page not found</h2>} />
           </Routes>
         </main>
       </BrowserRouter>
     );
   }
   
   const styles = {
     header: {
       display: "flex",
       alignItems: "center",
       padding: "0.5rem 1rem",
       background: "#222",
       color: "#fff",
       position: "sticky",
       top: 0,
       zIndex: 1000,
     },
     nav: { display: "flex", gap: "1rem" },
     link: ({ isActive }) => ({
       color: isActive ? "#ffd54f" : "#fff",
       textDecoration: "none",
       fontWeight: isActive ? 600 : 400,
     }),
   };
   