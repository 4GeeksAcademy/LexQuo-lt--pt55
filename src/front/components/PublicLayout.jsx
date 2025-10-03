import ScrollToTop from "./ScrollToTop"
import { PublicNavbar } from "./PublicNavbar"
import { PublicFooter } from "./PublicFooter"
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './CSSTransition.css';

export const PublicLayout = ({ children }) => {
    const location = useLocation();
    const [animationClass, setAnimationClass] = useState('fadeIn');

    useEffect(() => {
        setAnimationClass('fadeOut');

        const timer = setTimeout(() => {
            setAnimationClass('fadeIn');
        }, 50);

        return () => clearTimeout(timer);
    }, [location.key]); 

    return (
        <ScrollToTop>
            <PublicNavbar />
            <div className={`content-wrapper ${animationClass}`}>
                {children}
            </div>
            <PublicFooter />
        </ScrollToTop>
    )
}