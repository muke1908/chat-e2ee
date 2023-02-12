import React, {useContext} from 'react';
import Button from '../../components/Button';
import {ThemeContext} from '../../ThemeContext.js';
import styles from './Style.module.css';
import ThemeToggle from '../../components/ThemeToggle/index.js';
import {ErrorContext} from "../../ErrorContext";

const ChatError = () => {
    const [darkMode] = useContext(ThemeContext);
    const [errorMessage, setErrorMessage] = useContext(ErrorContext);
    return (
        <>
            <div className={styles.linkGenerationPage}>
                <div
                    className={`${styles.header}
          ${darkMode === true ? styles.darkModeHeader : styles.lightModeHeader}`}
                >
                    Ops Some thing went wrong ;-(
                    <ThemeToggle/>
                </div>
                <div className={`${styles.sectionDefault} ${!darkMode && styles.sectionDefaultLight}`}>
                    <div className={styles.title}>
                        unfortunately error happens.
                    </div>
                    <div className={styles.description}>
                        <ul>
                            <li>Log Error:</li>
                            <li>{ errorMessage}</li>

                        </ul>
                    </div>

                    <div className={styles.linkGenerationBtnContainer}>
                        <br/>
                        <Button
                            label="Back To Home"
                            type="primary"
                            onClick={(event) => {
                                window.location.href = '/';
                            }}
                        />
                    </div>


                </div>
            </div>
        </>
    );
};

export default ChatError;
