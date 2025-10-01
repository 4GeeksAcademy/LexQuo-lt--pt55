import { Link } from "react-router-dom"

export const Team = () => {
    return (
        <>
            <section id="team" className="bg-white">
                <div className="bg-white position-absolute h-70 w-100 bg-body" style={{ transform: "skew(0deg, -10deg)", top: "10%" }}></div>

                <div className="bg-holder bg-white z-2" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342631/image_vlijsj.png)", backgroundSize: "auto", backgroundPosition: "left center" }}></div>

                <div className="bg-holder z-2" style={{ backgroundImage: "url(https://phoenix-react-alt.prium.me/assets/bg-right-17-CRsD7o3l.png)", backgroundSize: "auto", backgroundPosition: "right center" }}></div>

                <div className="container-small position-relative py-1 px-lg-7 px-xxl-3" style={{ zIndex: 10 }}>
                    <div className="row">
                        <div className="mb-4 text-center text-sm-start col-12">
                            <h4 className="text-primary fw-bolder mb-3">Team</h4>
                            <h2>Our small team behind our success</h2>
                        </div>

                        <div className="text-center text-sm-start col-md-6">
                            <p>We have a small but strong development team to follow up on the development process. Reach out to us for further information.</p>
                        </div>

                        <div className="text-center text-sm-start col-md-6">
                            <p>The team is ready to answer all your questions within minutes. The efficient team is always at your beck and call.</p>
                        </div>
                    </div>

                    <div className="align-items-center ps-lg-11 pe-lg-9 row">
                        {/* Team member cards */}
                        <div className="col-lg-3 col-md-4 col-sm-6">
                            <div className="text-center mt-5 position-relative">
                                <div className="team-avatar-container d-inline-block position-relative">
                                    <div className="bg-holder" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)", backgroundSize: "contain" }}></div>
                                    <img className="img-fluid rounded mb-3 position-relative" alt="John Smith" src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343424/5_zrvrcp.jpg" />
                                </div>
                                <h4>John Smith</h4>
                                <h6 className="mb-3 fw-semibold">CEO, Global Cheat</h6>
                                <div>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-facebook-f"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-twitter"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary">
                                        <i className="fab fa-linkedin-in"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Additional team member cards with similar structure */}
                        {/* Marc Chiasson */}
                        <div className="col-lg-3 col-md-4 col-sm-6">
                            <div className="text-center mt-5 position-relative">
                                <div className="team-avatar-container d-inline-block position-relative">
                                    <div className="bg-holder" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)", backgroundSize: "contain" }}></div>
                                    <img className="img-fluid rounded mb-3 position-relative" alt="Marc Chiasson" src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343433/6_oyp1l1.png" />
                                </div>
                                <h4>Marc Chiasson</h4>
                                <h6 className="mb-3 fw-semibold">Vice President</h6>
                                <div>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-facebook-f"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-twitter"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary">
                                        <i className="fab fa-linkedin-in"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Lilah Lola */}
                        <div className="col-lg-3 col-md-4 col-sm-6">
                            <div className="text-center mt-5 position-relative">
                                <div className="team-avatar-container d-inline-block position-relative">
                                    <div className="bg-holder" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)", backgroundSize: "contain" }}></div>
                                    <img className="img-fluid rounded mb-3 position-relative" alt="Lilah Lola" src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343431/3_quriso.png" />
                                </div>
                                <h4>Lilah Lola</h4>
                                <h6 className="mb-3 fw-semibold">Marketing Manager</h6>
                                <div>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-facebook-f"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-twitter"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary">
                                        <i className="fab fa-linkedin-in"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-3 col-md-4 col-sm-6">
                            <div className="text-center mt-5 position-relative">
                                <div className="team-avatar-container d-inline-block position-relative">
                                    <div className="bg-holder" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)", backgroundSize: "contain" }}></div>
                                    <img className="img-fluid rounded mb-3 position-relative" alt="Carol Trump" src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343431/4_kjzfgd.png" />
                                </div>
                                <h4>Carol Trump</h4>
                                <h6 className="mb-3 fw-semibold">UX Designer</h6>
                                <div>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-facebook-f"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-twitter"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary">
                                        <i className="fab fa-linkedin-in"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-3 col-md-4 col-sm-6">
                            <div className="text-center mt-5 position-relative">
                                <div className="team-avatar-container d-inline-block position-relative">
                                    <div className="bg-holder" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)", backgroundSize: "contain" }}></div>
                                    <img className="img-fluid rounded mb-3 position-relative" alt="Alan Casey" src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343423/1_jaqjtf.png" />
                                </div>
                                <h4>Alan Casey</h4>
                                <h6 className="mb-3 fw-semibold">Front End Developer</h6>
                                <div>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-facebook-f"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-twitter"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary">
                                        <i className="fab fa-linkedin-in"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-3 col-md-4 col-sm-6">
                            <div className="text-center mt-5 position-relative">
                                <div className="team-avatar-container d-inline-block position-relative">
                                    <div className="bg-holder" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)", backgroundSize: "contain" }}></div>
                                    <img className="img-fluid rounded mb-3 position-relative" alt="Narokin Hijita" src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343430/2_lye0ni.png" />
                                </div>
                                <h4>Narokin Hijita</h4>
                                <h6 className="mb-3 fw-semibold">CEO, Global Cheat</h6>
                                <div>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-facebook-f"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-twitter"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary">
                                        <i className="fab fa-linkedin-in"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-3 col-md-4 col-sm-6">
                            <div className="text-center mt-5 position-relative">
                                <div className="team-avatar-container d-inline-block position-relative">
                                    <div className="bg-holder" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)", backgroundSize: "contain" }}></div>
                                    <img className="img-fluid rounded mb-3 position-relative" alt="Patrick Fonz" src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343781/7_sw6hik.png" />
                                </div>
                                <h4>Patrick Fonz</h4>
                                <h6 className="mb-3 fw-semibold">CEO, Global Cheat</h6>
                                <div>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-facebook-f"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-twitter"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary">
                                        <i className="fab fa-linkedin-in"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-3 col-md-4 col-sm-6">
                            <div className="text-center mt-5 position-relative">
                                <div className="team-avatar-container d-inline-block position-relative">
                                    <div className="bg-holder" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)", backgroundSize: "contain" }}></div>
                                    <img className="img-fluid rounded mb-3 position-relative" alt="Alex Johnson" src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759343788/8_f7dke3.png" />
                                </div>
                                <h4>Alex Johnson</h4>
                                <h6 className="mb-3 fw-semibold">CEO, Global Cheat</h6>
                                <div>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-facebook-f"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary me-3">
                                        <i className="fab fa-twitter"></i>
                                    </Link>
                                    <Link to="#!" className="text-primary">
                                        <i className="fab fa-linkedin-in"></i>
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