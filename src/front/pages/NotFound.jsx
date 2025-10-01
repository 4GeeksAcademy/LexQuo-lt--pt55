import { Link } from "react-router-dom"
import { PublicLayout } from "../components/PublicLayout"

export const NotFound = () => {
    return (
        <PublicLayout>
            <section className="bg-white min-vh-100 d-flex align-items-center">
                <div className="bg-white position-absolute h-70 w-100 bg-body" style={{ transform: "skew(0deg, -10deg)", top: "10%" }}></div>
                <div className="bg-holder bg-white z-2" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342631/image_vlijsj.png)", backgroundSize: "auto", backgroundPosition: "left center" }}></div>
                <div className="bg-holder z-2" style={{ backgroundImage: "url(https://phoenix-react-alt.prium.me/assets/bg-right-17-CRsD7o3l.png)", backgroundSize: "auto", backgroundPosition: "right center" }}></div>

                <div className="container position-relative" style={{ zIndex: 10 }}>
                    <div className="row align-items-center justify-content-center">
                        <div className="col-lg-6 text-center">

                            <div className="mb-4">
                                <h1 className="display-1 fw-bolder text-primary mb-0" style={{ fontSize: '8rem' }}>
                                    404
                                </h1>
                                <div className="position-relative d-inline-block">
                                    <div className="bg-holder" style={{
                                        backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)",
                                        backgroundSize: "contain"
                                    }}></div>
                                    <h2 className="h1 fw-bold text-dark position-relative mb-3">
                                        Page Not Found
                                    </h2>
                                </div>
                            </div>

                            <p className="lead text-secondary mb-5 mx-auto" style={{ maxWidth: '500px' }}>
                                Oops! The page you're looking for seems to have vanished into thin air.
                                It might have been moved, deleted, or perhaps it never existed in the first place.
                            </p>
                            <div className="mb-5">
                                <img
                                    src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759350890/undraw_not-found_6bgl_phpnhr.png"
                                    alt="Lost page illustration"
                                    className="img-fluid opacity-75"
                                    style={{ maxHeight: '200px' }}
                                />
                            </div>

                            <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                                <Link
                                    to="/"
                                    className="btn btn-primary btn-lg fw-bold px-5 py-3 shadow-sm"
                                >
                                    <i className="bi bi-house-door me-2"></i>
                                    Back to Home
                                </Link>

                                <button
                                    onClick={() => window.history.back()}
                                    className="btn btn-outline-primary btn-lg fw-bold px-5 py-3"
                                >
                                    <i className="bi bi-arrow-left me-2"></i>
                                    Go Back
                                </button>
                            </div>
                            <div className="mt-6 pt-4 border-top border-primary border-opacity-10">
                                <p className="text-muted small mb-2">
                                    If you believe this is an error, please contact our support team
                                </p>
                                <div className="d-flex justify-content-center gap-3">
                                    <a href="mailto:support@lexquo.com" className="text-primary text-decoration-none small">
                                        <i className="bi bi-envelope me-1"></i>
                                        support@lexquo.com
                                    </a>
                                    <a href="tel:+871406-7509" className="text-primary text-decoration-none small">
                                        <i className="bi bi-telephone me-1"></i>
                                        (871) 406-7509
                                    </a>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    )
}