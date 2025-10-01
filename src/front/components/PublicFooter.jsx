import { Link } from 'react-router-dom'

export const PublicFooter = () => {
    return (
        <>
            <div className="position-relative">
                <section className="position-relative overflow-hidden" style={{
                    backgroundImage: 'url(https://prium.github.io/phoenix/v1.23.0/assets/img/bg/bg-19.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: 'var(--bs-primary)'
                }}>
                    <div className="position-absolute top-0 start-0 w-100" style={{ zIndex: 1 }}>
                        <svg className="w-100" preserveAspectRatio="none" viewBox="0 0 1920 368" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1920 0.44L0 367.74V0H1920V0.44Z" fill="#fff"></path>
                        </svg>
                    </div>

                    <div className="container position-relative" style={{ zIndex: 2, paddingTop: '300px', paddingBottom: '14px' }}>
                        <div className="row">
                            <div className="col-12 col-lg-5 mb-4">
                                <Link to="/" className="d-block mb-3">
                                    <img src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759017460/LogoLexQuoB_thlvwr.png" height="48" alt="LexQuo" />
                                </Link>
                                <p className="text-white text-opacity-75">
                                    The legal platform for your <br />solo practice.
                                </p>
                            </div>
                            <div className="col-lg-7">
                                <div className="row">
                                    <div className="col-6 col-md-4 col-lg-4 mb-4">
                                        <div className="border-start border-white border-opacity-25 ps-3">
                                            <h5 className="fw-bold mb-3 text-white">Help</h5>
                                            <ul className="list-unstyled mb-4">
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">About Us</Link></li>
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">Contact</Link></li>
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">Plans and Pricing</Link></li>
                                            </ul>
                                        </div>
                                        <div className="border-start border-white border-opacity-25 ps-3">
                                            <h5 className="fw-bold mb-3 text-white">Follow Us</h5>
                                            <ul className="list-unstyled">
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">LinkedIn</Link></li>
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">Twitter</Link></li>
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">Facebook</Link></li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="col-6 col-md-4 col-lg-4 mb-4">
                                        <div className="border-start border-white border-opacity-25 ps-3">
                                            <h5 className="fw-bold text-white mb-3">Legal Support</h5>
                                            <ul className="list-unstyled">
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">Privacy Policy</Link></li>
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">Terms of Service</Link></li>
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">Community</Link></li>
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">Blog for Lawyers</Link></li>
                                                <li className="mb-2"><Link className="text-white text-opacity-75 text-decoration-none small" to="/">FAQ</Link></li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-4 col-lg-4 mb-4">
                                        <div className="bg-dark bg-opacity-25 p-4 rounded-3">
                                            <h5 className="fw-bold text-white mb-2">
                                                Ready to Free Up Your Practice?
                                            </h5>
                                            <p className="text-white text-opacity-75 small mb-3">
                                                Start saving administrative hours today and focus on what matters: your clients.
                                            </p>
                                            <Link className="btn btn-success fw-bold w-100 py-2" to="/sign-up" role="button">
                                                Try LexQuo
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Copyright */}
            <div className="text-center py-3 small text-white bg-dark">
                © 2024 LexQuo. All rights reserved.
            </div>
        </>
    )
}