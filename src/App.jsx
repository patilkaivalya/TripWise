import { useEffect, useState } from "react";

import Home from "./pages/Home";
import Results from "./pages/Results";


function App() {
  const [currentPath, setCurrentPath] = useState(
    window.location.pathname
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, []);


  // Results page
  if (currentPath === "/results") {
    return <Results />;
  }


  // Default page
  return <Home />;
}


export default App;