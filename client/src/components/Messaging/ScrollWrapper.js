import React, {useRef, useEffect, useState} from 'react';
import styles from './styles/ScrollWrapper.module.css';


export const ScrollWrapper = ({children, messageCount}) => {

    const messagesOwner = React.Children.toArray(children).map((({props}) => props?.message?.owner === true));
    let isOwner = messagesOwner[messagesOwner.length - 1];
    const wrapperRef = useRef(null);
    const [scrollMoveUp, setScrollMoveUp] = useState(true);
    const [read, setRead] = useState(0);

    const onNewMessage = (event) => {
        event.preventDefault();
        const length = wrapperRef.current.childNodes.length-1;
        wrapperRef.current.childNodes[length- (messageCount - read)].scrollIntoView()
     //    wrapperRef.current.scrollTop = pointer;

    }

    const onScrollMove = (event) => {
        const isBottom = Math.abs(event.target.scrollHeight - event.target.clientHeight - event.target.scrollTop) < 1;
        if (isOwner) {
            setScrollMoveUp(true);
            setRead(0);
        } else if (isBottom === false && isOwner === false) {
            setScrollMoveUp(false);
            setRead(messageCount);
        } else {
            setScrollMoveUp(true);
            setRead(0);
        }


    }


    useEffect(() => {

        if (scrollMoveUp)
            wrapperRef.current.scrollTop = wrapperRef.current.scrollHeight;


    }, [messageCount, scrollMoveUp]);

    return (<>
            {
                messageCount !== read && scrollMoveUp === false && isOwner === false ?
                    <a onClick={onNewMessage} className={styles.fixedButton}>
                        <div className={styles.roundedFixedBtn}>new({messageCount - read})</div>
                    </a> : ''
            }


            <div className={styles.scrollWrapper} onScroll={onScrollMove} ref={wrapperRef}>
                {children}
            </div>

        </>

    );
};
