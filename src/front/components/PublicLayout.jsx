import ScrollToTop from "./ScrollToTop";
import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE_OUT = [0.22, 1, 0.36, 1]; // suave
const EASE_IN  = [0.4, 0, 0.2, 1];   // nativo-like

export const PublicLayout = ({ children }) => {
  const location = useLocation();
  const reduce = useReducedMotion();

  const variants = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.24 } },
        exit:    { opacity: 0, transition: { duration: 0.18 } },
      }
    : {
        initial: { opacity: 0, y: 6, filter: "blur(4px)" },
        animate: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.32, ease: EASE_OUT },
        },
        exit: {
          opacity: 0,
          y: 6,
          filter: "blur(4px)",
          transition: { duration: 0.15, ease: EASE_IN },
        },
      };

  return (
    <ScrollToTop>
      <PublicNavbar />

      <AnimatePresence mode="wait">
        <motion.div
          key={location.key}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ willChange: "opacity, transform, filter" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      <PublicFooter />
    </ScrollToTop>
  );
};