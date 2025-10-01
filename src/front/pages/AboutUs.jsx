import { Link } from "react-router-dom"

export const AboutUs = () => {
    return (
        <>
            <section id="about" className="bg-white">
                {/* Fondos decorativos */}
                <div className="bg-holder bg-white z-2" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342631/image_vlijsj.png)", backgroundSize: "auto", backgroundPosition: "left center" }}></div>
                <div className="bg-holder z-2" style={{ backgroundImage: "url(https://phoenix-react-alt.prium.me/assets/bg-right-17-CRsD7o3l.png)", backgroundSize: "auto", backgroundPosition: "right center" }}></div>

                <div className="container-small position-relative py-1 px-lg-7 px-xxl-3" style={{ zIndex: 10 }}>
                    {/* Hero Section */}
                    <div className="row align-items-center min-vh-50 py-8">
                        <div className="col-lg-6">
                            <h4 className="text-primary fw-bolder mb-3">About LexQuo</h4>
                            <h1 className="display-4 fw-bolder text-dark mb-4">
                                Revolutionizing Legal Practice Through Technology
                            </h1>
                            <p className="lead text-secondary mb-5">
                                We're on a mission to transform how solo practitioners and small law firms operate,
                                replacing administrative overhead with intelligent automation and strategic insights.
                            </p>
                            <div className="d-flex flex-wrap gap-3">
                                <Link to="/sign-up" className="btn btn-primary btn-lg fw-bold px-5 py-3">
                                    Sign up
                                </Link>
                            </div>
                        </div>
                        <div className="col-lg-6 mt-5 mt-lg-0">
                            <div className="position-relative">
                                <div className="bg-primary bg-opacity-10 rounded-4 p-4 p-lg-5">
                                    <img
                                        src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759351974/undraw_stock-prices_8nuz_njrlod.png"
                                        className="img-fluid"
                                        alt="Modern legal workspace"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="row py-8 border-top border-bottom border-primary border-opacity-10">
                        <div className="col-md-3 text-center mb-4 mb-md-0">
                            <h3 className="display-4 fw-bold text-primary mb-2">50+</h3>
                            <p className="text-secondary fw-semibold">Law Firms Empowered</p>
                        </div>
                        <div className="col-md-3 text-center mb-4 mb-md-0">
                            <h3 className="display-4 fw-bold text-primary mb-2">10k+</h3>
                            <p className="text-secondary fw-semibold">Cases Managed</p>
                        </div>
                        <div className="col-md-3 text-center mb-4 mb-md-0">
                            <h3 className="display-4 fw-bold text-primary mb-2">15+</h3>
                            <p className="text-secondary fw-semibold">Hours Saved Weekly</p>
                        </div>
                        <div className="col-md-3 text-center">
                            <h3 className="display-4 fw-bold text-primary mb-2">99.9%</h3>
                            <p className="text-secondary fw-semibold">Uptime Reliability</p>
                        </div>
                    </div>

                    {/* Mission & Vision */}
                    <div className="row py-8">
                        <div className="col-lg-6 mb-5 mb-lg-0">
                            <div className="pe-lg-5">
                                <h2 className="h1 fw-bold text-primary mb-4">Our Mission</h2>
                                <p className="text-secondary mb-4 fs-5">
                                    To empower legal professionals by eliminating administrative burdens through
                                    intelligent technology, allowing them to focus on what truly matters: practicing law.
                                </p>
                                <div className="d-flex align-items-center mb-4">
                                    <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-4">
                                        <i className="bi bi-lightning-charge-fill text-primary fs-4"></i>
                                    </div>
                                    <div>
                                        <h5 className="fw-bold text-dark">Efficiency First</h5>
                                        <p className="text-secondary mb-0">Automate routine tasks and save valuable time</p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center mb-4">
                                    <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-4">
                                        <i className="bi bi-shield-lock-fill text-primary fs-4"></i>
                                    </div>
                                    <div>
                                        <h5 className="fw-bold text-dark">Security Focused</h5>
                                        <p className="text-secondary mb-0">Bank-level encryption for client confidentiality</p>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center">
                                    <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-4">
                                        <i className="bi bi-graph-up-arrow text-primary fs-4"></i>
                                    </div>
                                    <div>
                                        <h5 className="fw-bold text-dark">Growth Oriented</h5>
                                        <p className="text-secondary mb-0">Scale your practice without increasing overhead</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="ps-lg-5">
                                <img
                                    src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759352257/pexels-august-de-richelieu-4427548_fo9mcq.jpg"
                                    className="img-fluid rounded-4 shadow-lg"
                                    alt="Attorney using LexQuo platform"
                                    style={{ maxHeight: '500px', width: '100%', objectFit: 'cover' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="row py-8">
                        <div className="col-12 text-center mb-6">
                            <h2 className="h1 fw-bold text-dark mb-3">Why Legal Professionals Choose LexQuo</h2>
                            <p className="lead text-secondary mx-auto" style={{ maxWidth: '600px' }}>
                                Built by legal experts for legal experts. Every feature is designed to address real challenges faced by modern law practices.
                            </p>
                        </div>

                        <div className="col-md-4 mb-4">
                            <div className="bg-white p-4 rounded-4 shadow-sm border border-primary border-opacity-10 h-100 text-center">
                                <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex align-items-center justify-content-center mb-4">
                                    <i className="bi bi-robot text-primary fs-2"></i>
                                </div>
                                <h4 className="fw-bold text-dark mb-3">AI-Powered Tools</h4>
                                <p className="text-secondary">
                                    Smart document analysis, automated legal research, and intelligent case predictions powered by cutting-edge AI.
                                </p>
                            </div>
                        </div>

                        <div className="col-md-4 mb-4">
                            <div className="bg-white p-4 rounded-4 shadow-sm border border-primary border-opacity-10 h-100 text-center">
                                <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex align-items-center justify-content-center mb-4">
                                    <i className="bi bi-calendar-check text-primary fs-2"></i>
                                </div>
                                <h4 className="fw-bold text-dark mb-3">Case Management</h4>
                                <p className="text-secondary">
                                    Centralized case tracking, deadline management, and client communication all in one secure platform.
                                </p>
                            </div>
                        </div>

                        <div className="col-md-4 mb-4">
                            <div className="bg-white p-4 rounded-4 shadow-sm border border-primary border-opacity-10 h-100 text-center">
                                <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex align-items-center justify-content-center mb-4">
                                    <i className="bi bi-gem text-primary fs-2"></i>
                                </div>
                                <h4 className="fw-bold text-dark mb-3">Premium Support</h4>
                                <p className="text-secondary">
                                    Dedicated legal technology specialists available 24/7 to ensure your practice runs smoothly.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <div className="row py-8">
                        <div className="col-12">
                            <div className="bg-primary rounded-4 p-5 text-center text-white">
                                <h2 className="h1 fw-bold mb-3">Ready to Transform Your Practice?</h2>
                                <p className="lead mb-4 opacity-90">
                                    Join hundreds of legal professionals who have already revolutionized their workflow with LexQuo.
                                </p>
                                <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
                                    <Link to="/sign-up" className="btn btn-light btn-lg fw-bold px-5 py-3">
                                        Start now
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}