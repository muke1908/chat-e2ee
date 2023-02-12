import React, {useState, createContext} from 'react';
export const ErrorContext = createContext(null);

export const ErrorProvider = (props) => {
    const [errorMessage, setErrorMessage] = useState("");
    return (
        <ErrorContext.Provider value={[errorMessage, setErrorMessage]}>{props.children}</ErrorContext.Provider>
    );
};
