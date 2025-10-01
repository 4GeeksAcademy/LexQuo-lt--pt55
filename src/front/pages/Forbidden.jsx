import { Link } from "react-router-dom";

export const Forbidden = () => {
  return (
    <>
      <section className="bg-white min-vh-100 d-flex align-items-center">
        <div className="bg-white position-absolute h-70 w-100 bg-body" style={{ transform: "skew(0deg, -10deg)", top: "10%" }}></div>

        <div className="bg-holder bg-white z-2" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342631/image_vlijsj.png)", backgroundSize: "auto", backgroundPosition: "left center" }}></div>
        <div className="bg-holder z-2" style={{ backgroundImage: "url(https://phoenix-react-alt.prium.me/assets/bg-right-17-CRsD7o3l.png)", backgroundSize: "auto", backgroundPosition: "right center" }}></div>

        <div className="container position-relative" style={{ zIndex: 10 }}>
          <div className="row align-items-center justify-content-center">
            <div className="col-lg-6 text-center">

              <div className="mb-4">
                <div className="icon-wrapper rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-4"
                  style={{ width: '100px', height: '100px' }}>
                  <i className="bi bi-person-lock text-primary fs-1"></i>
                </div>
                <h1 className="display-4 fw-bolder text-primary mb-3">
                  Access Required
                </h1>
              </div>

              <div className="bg-white p-4 p-md-5 rounded-4 shadow-sm border border-primary border-opacity-25 mb-5">
                <h2 className="h4 fw-bold text-dark mb-3">
                  Authentication Needed
                </h2>
                <p className="text-secondary mb-4">
                  This content is available only for <strong className="text-primary">logged-in users</strong>.
                  Please sign in to access this page and continue using LexQuo's features.
                </p>

                <div className="bg-primary bg-opacity-10 rounded-3 p-3 mb-4">
                  <p className="text-dark mb-0 small">
                    <i className="bi bi-info-circle me-2"></i>
                    Don't have an account? <Link to="/sign-up" className="text-primary fw-semibold text-decoration-none">Create one here</Link> to get started with LexQuo.
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                <Link
                  to="/sign-in"
                  className="btn btn-primary btn-lg fw-bold px-5 py-3 shadow-sm text-white"
                >
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Sign In
                </Link>

                <Link
                  to="/"
                  className="btn btn-outline-primary btn-lg fw-bold px-5 py-3"
                >
                  <i className="bi bi-house-door me-2"></i>
                  Go to Homepage
                </Link>
              </div>

              <div className="mt-6 pt-4 border-top border-primary border-opacity-10">
                <p className="text-muted small mb-2">
                  Need help accessing your account?
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <a href="mailto:support@lexquo.com" className="text-primary text-decoration-none small">
                    <i className="bi bi-envelope me-1"></i>
                    Contact Support
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
    </>
  );
};