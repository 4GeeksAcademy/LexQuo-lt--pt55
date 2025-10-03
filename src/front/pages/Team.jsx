import { Link } from "react-router-dom"
import { PublicLayout } from "../components/PublicLayout"

export const Team = () => {
    return (
        <PublicLayout>
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
                        <div className="text-center text-sm-start col-12">
                            <p className="lead mb-4">
                                We have a compact but highly skilled development team that meticulously follows every stage of the development process.
                                Our approach combines technical expertise with agile methodologies to deliver robust, scalable solutions that exceed expectations.
                            </p>
                            <p className="mb-4">
                                Our developers are not just coders - they're problem solvers who understand business objectives and user needs.
                                We maintain transparent communication throughout the project lifecycle, ensuring you're always informed and involved in key decisions.
                            </p>
                            <p>
                                The team is ready to answer all your technical questions within minutes and provide comprehensive support.
                                Our efficient team is always at your beck and call, dedicated to turning your vision into reality with precision and innovation.
                            </p>
                        </div>
                    </div>

                    <div className="row justify-content-center">
                        <div className="col-lg-3 col-md-4 col-sm-6 mb-4">
                            <div className="text-center mt-5 position-relative">
                                <div className="team-avatar-container d-inline-block position-relative">
                                    <div className="bg-holder" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)", backgroundSize: "contain" }}></div>
                                    <img
                                        className="img-fluid rounded mb-3 position-relative"
                                        alt="Ayelen Lecman"
                                        src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759457004/18061cf5-1f22-4066-83a3-37bdfd2054e3.png"
                                        style={{ width: "200px", height: "200px", objectFit: "cover" }}
                                    />
                                </div>
                                <h4>Ayelen Lecman</h4>
                                <h6 className="mb-3 fw-semibold">Developer</h6>
                                <div>
                                    <Link to="https://github.com/AyeLec" className="text-primary me-3" target="_blank" rel="noopener noreferrer">
                                        <i className="fab fa-github fa-lg"></i>
                                    </Link>
                                    <Link to="https://www.linkedin.com/in/ayelecman" className="text-primary" target="_blank" rel="noopener noreferrer">
                                        <i className="fab fa-linkedin-in fa-lg"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-3 col-md-4 col-sm-6 mb-4">
                            <div className="text-center mt-5 position-relative">
                                <div className="team-avatar-container d-inline-block position-relative">
                                    <div className="bg-holder" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342951/image_1_oj80dn.png)", backgroundSize: "contain" }}></div>
                                    <img
                                        className="img-fluid rounded mb-3 position-relative"
                                        alt="Yilfri Salave"
                                        src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759457031/d8f8e45e-9b5b-433b-a84b-f6f5a30d67f0.png"
                                        style={{ width: "200px", height: "200px", objectFit: "cover" }}
                                    />
                                </div>
                                <h4>Yilfri Salave</h4>
                                <h6 className="mb-3 fw-semibold">Developer</h6>
                                <div>
                                    <Link to="https://github.com/yilfri" className="text-primary me-3" target="_blank" rel="noopener noreferrer">
                                        <i className="fab fa-github fa-lg"></i>
                                    </Link>
                                    <Link to="https://www.linkedin.com/in/yilfris" className="text-primary" target="_blank" rel="noopener noreferrer">
                                        <i className="fab fa-linkedin-in fa-lg"></i>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    )
}