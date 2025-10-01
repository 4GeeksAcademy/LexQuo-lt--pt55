import { Link } from "react-router-dom"
import { PublicLayout } from "../components/PublicLayout"

export const ContactUs = () => {
    return (
        <PublicLayout>
            <section id="contact" className="bg-white">
                <div className="bg-white position-absolute h-70 w-100 bg-body" style={{ transform: "skew(0deg, -10deg)", top: "10%" }}></div>

                <div className="bg-holder bg-white z-2" style={{ backgroundImage: "url(https://res.cloudinary.com/doxdmmj1o/image/upload/v1759342631/image_vlijsj.png)", backgroundSize: "auto", backgroundPosition: "left center" }}></div>
                <div className="bg-holder z-2" style={{ backgroundImage: "url(https://phoenix-react-alt.prium.me/assets/bg-right-17-CRsD7o3l.png)", backgroundSize: "auto", backgroundPosition: "right center" }}></div>

                <div className="container-small position-relative py-1 px-lg-7 px-xxl-3" style={{ zIndex: 10 }}>
                    <h4 className="text-primary fw-bolder mb-2">Contact Us</h4>
                    <div className="row g-5 g-lg-5 container-small mx-auto py-10 py-md-2 px-0">
                        <div className="col-md-6 mb-5 mb-md-0 text-center text-md-start px-0">
                            <h2 className="mb-3">Stay connected</h2>
                            <p className="mb-5">Stay connected with LexQuo's Help Center; LexQuo is available for your necessities at all times.</p>
                            <div className="d-flex flex-column align-items-center align-items-md-start gap-3 gap-md-0">
                                <div className="d-md-flex align-items-center">
                                    <div className="icon-wrapper shadow-info">
                                        <i className="bi bi-telephone text-primary fs-5 z-1 ms-2"></i>
                                        <span className="uil uil-phone text-primary fs-4 z-1 ms-2" data-bs-theme="light"></span>
                                    </div>
                                    <div className="flex-1 ms-3">
                                        <a className="link-900" href="tel:+871406-7509">(871) 406-7509</a>
                                    </div>
                                </div>
                                <div className="d-md-flex align-items-center">
                                    <div className="icon-wrapper shadow-info">
                                        <i className="bi bi-envelope text-primary fs-5 z-1 ms-2"></i>
                                        <span className="uil uil-envelope text-primary fs-4 z-1 ms-2" data-bs-theme="light"></span>
                                    </div>
                                    <div className="flex-1 ms-3">
                                        <a className="fw-semibold text-body" href="mailto:support@lexquo.com">support@lexquo.com</a>
                                    </div>
                                </div>
                                <div className="mb-6 d-md-flex align-items-center">
                                    <div className="icon-wrapper shadow-info">
                                        <i className="bi bi-geo-alt text-primary fs-5 z-1 ms-2"></i>
                                        <span className="uil uil-map-marker text-primary fs-4 z-1 ms-2" data-bs-theme="light"></span>
                                    </div>
                                    <div className="flex-1 ms-3">
                                        <Link className="d-block link-900" to="#">39163 Amir Drive Suite 802</Link>
                                    </div>
                                </div>
                                <div className="d-flex">
                                    <a href="#!">
                                        <svg className="svg-inline--fa fa-facebook fs-6 me-3 text-primary" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="facebook" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                                            <path fill="currentColor" d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H141.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.2 3.2 55.7 6.4V172c-6-.6-16.5-1-29.6-1c-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H287V510.1C413.8 494.8 512 386.9 512 256h0z"></path>
                                        </svg>
                                    </a>
                                    <a href="#!">
                                        <svg className="svg-inline--fa fa-twitter fs-6 me-3 text-primary" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="twitter" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                                            <path fill="currentColor" d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"></path>
                                        </svg>
                                    </a>
                                    <a href="#!">
                                        <svg className="svg-inline--fa fa-linkedin-in fs-6 text-primary" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="linkedin-in" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                                            <path fill="currentColor" d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"></path>
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 text-center text-md-start">
                            <h3 className="mb-3">Drop us a line</h3>
                            <p className="mb-7">If you have any query or suggestion , we are open to learn from you, Lets talk, reach us anytime.</p>
                            <form className="row g-4">
                                <div className="col-12">
                                    <input className="form-control bg-body-emphasis" type="text" name="name" placeholder="Name" required />
                                </div>
                                <div className="col-12">
                                    <input className="form-control bg-body-emphasis" type="email" name="email" placeholder="Email" required />
                                </div>
                                <div className="col-12">
                                    <textarea className="form-control bg-body-emphasis" rows="6" name="message" placeholder="Message" required></textarea>
                                </div>
                                <div className="col-12 d-grid">
                                    <button className="btn btn-outline-primary" type="submit">Submit</button>
                                </div>
                                <div className="feedback"></div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    )
}