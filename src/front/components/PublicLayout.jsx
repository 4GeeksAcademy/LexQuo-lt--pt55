import ScrollToTop from "./ScrollToTop"
import { PublicNavbar } from "./PublicNavbar"
import { PublicFooter } from "./PublicFooter"

export const PublicLayout = ({ children }) => {
    return (
        <ScrollToTop>
            <PublicNavbar />
            {children}
            <PublicFooter />
        </ScrollToTop>
    )
}