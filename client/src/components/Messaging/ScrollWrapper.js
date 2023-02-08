import React, {useRef, useEffect, useState} from 'react';
import styles from './styles/ScrollWrapper.module.css';


export const ScrollWrapper = ({children, messageCount}) => {
    const messagesOwner = React.Children.toArray(children).map((({props}) => props?.message?.owner === true));
    let isOwner = messagesOwner[messagesOwner.length - 1];
    const wrapperRef = useRef(null);
    const [scrollMoveUp, setScrollMoveUp] = useState(true);

    const onScrollMove = (event) => {
        const isBottom = Math.abs(event.target.scrollHeight - event.target.clientHeight - event.target.scrollTop) < 1;
        if (isOwner) {
            setScrollMoveUp(true);
        } else if (isBottom === false && isOwner === false) {
            setScrollMoveUp(false);
        } else {
            setScrollMoveUp(true);

        }

    }


    useEffect(() => {

        if (scrollMoveUp)
            wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;


    }, [messageCount, scrollMoveUp]);

    return (
        <div className={styles.scrollWrapper} onScroll={onScrollMove} ref={wrapperRef}>
            {children}
        </div>
    );
};
