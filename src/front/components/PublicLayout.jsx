import { PublicNavbar } from "./PublicNavbar"
import ScrollToTop from "./ScrollToTop"
import { Outlet } from "react-router-dom"
import { Home } from "../pages/Home"
import { PublicFooter } from "./PublicFooter"

export const PublicLayout = () => {
    return (
        <ScrollToTop>
            <PublicNavbar >
                <Home />
            </PublicNavbar>
            <Outlet />
            <PublicFooter />
        </ScrollToTop>
    )
}