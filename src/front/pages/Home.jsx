import { Link } from "react-router-dom";
import { PublicLayout } from "../components/PublicLayout";

export const Home = () => {
	return (
		<PublicLayout>
			<section className="bg-body-emphasis bg-white pb-8" id="home">
				<div className="container-small hero-header-container px-lg-7 px-xxl-3">
					<div className="row align-items-center">
						<div className="col-12 col-lg-auto order-0 order-md-1 text-end order-1">
							<div className="hero-image-container position-absolute top-0 bottom-0 end-0 d-none d-lg-block">
								<div className="position-relative h-100 w-100">
									<div className="position-absolute h-100 top-0 d-flex align-items-center end-0 hero-image-container-bg">
										<img className="pt-7 pt-md-0 w-100" src="https://prium.github.io/phoenix/v1.23.0/assets/img/bg/bg-1-2.png" alt="hero-header" />
									</div>
									<div className="position-absolute h-100 top-0 d-flex align-items-center end-0">
										{<img className="pt-7 pt-md-0 w-100 shadow-lg d-dark-none rounded-2" src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759091544/c2f9c42d-7ee1-4674-aa19-1511f595097e.png" alt="hero-header" />}
									</div>
								</div>
							</div>
						</div>
						<div className="col-12 col-lg-6 text-lg-start text-center pt-8 pb-6 order-0 position-relative">
							<h1 className="fs-3 fs-lg-2 fs-md-1 fs-lg-2 fs-xl-1 fs fw-black mb-4">Free your practice.
								<br /><span className="text-primary me-3">Multiply</span>your impact<br />
							</h1>
							<p className="mb-5">The legal platform that automates case management, appointments, and AI-powered documents, freeing you to focus on legal strategy.</p>
							<Link className="btn btn-lg btn-primary rounded-pill me-3" to="/Sign-up" role="button">Sign up</Link>
						</div>
					</div>
				</div>
			</section>
			<section className="pt-15 pb-0" id="feature">
				<div className="container-small px-lg-7 px-xxl-3">
					<div className="position-relative z-2">
						<div className="row">
							<div className="col-lg-6 text-center text-lg-start pe-xxl-3">
								<h4 className="text-primary fw-bolder mb-4">Features</h4>
								<h2 className="mb-3 text-body-emphasis lh-base">
									LexQuo:  <br className="d-md-none" />
									The Platform Built for the Modern Lawyer.
								</h2>
								<p className="mb-5">
									Automate management, enhance your strategy with AI, and secure your payment flows. Focus on the law, not the administration.
								</p>
								<Link className="btn btn-lg btn-outline-primary rounded-pill me-2" to="/sign-up" role="button">Find out more</Link>
							</div>
							<div className="col-sm-6 col-lg-3 mt-7 text-center text-lg-start">
								<div className="h-100 d-flex flex-column justify-content-between">
									<div className="border-start-lg border-translucent border-dashed ps-4">
										<div className="text-center">
											<i className="bi bi-robot fs-4 text text-primary"></i>
										</div>
										<div>
											<h5 className="fw-bolder mb-2">Intelligent Assistance 24/7</h5>
											<p className="fw-semibold lh-sm">
												Get concise summaries of your PDFs and AI suggestions to enhance your strategy in every courtfile, saving hours of reading.
											</p>
										</div>
										<div>
											<Link className="btn btn-link me-2 p-0 fs-9" to="/sign-up" role="button">See it in action</Link>
										</div>
									</div>
								</div>
							</div>
							<div className="col-sm-6 col-lg-3 mt-7 text-center text-lg-start">
								<div className="h-100 d-flex flex-column">
									<div className="border-start-lg border-translucent border-dashed ps-4">
										<div className="text-center">
											<i className="bi bi-box-seam fs-4 text text-primary"></i>
										</div>
										<div>
											<h5 className="fw-bolder mb-2">Centralized 360° Management</h5>
											<p className="fw-semibold lh-sm">
												Cases, appointments, high-priority deadlines, and documents (Word, Excel, Audio) in a single integrated dashboard for the Lawyer.
											</p>
										</div>
										<div>
											<Link className="btn btn-link me-2 p-0 fs-9" to="/sign-up" role="button">See it in action</Link>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div className="row mt-12 align-items-center justify-content-between text-center text-lg-start mb-6 mb-lg-0">
							<div className="col-lg-5">
								<img
									className="feature-image img-fluid mb-9 mb-lg-0 d-dark-none"
									src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759100795/undraw_send-money_4qc7__1_-removebg-preview_xih2tm.png"
									alt="FINANCE"
								/>
							</div>
							<div className="col-lg-6">
								<h6 className="text-primary mb-2 ls-2">FINANCE</h6>
								<h3 className="fw-bolder mb-3">Simplified Payment Flows</h3>
								<p className="mb-4 px-md-7 px-lg-0">
									Send payment requests, allow CC payments, and shorten your collection cycles effortlessly. A smooth experience for you and your client.
								</p>
							</div>
						</div>
						<div className="row mt-2 align-items-center justify-content-between text-center text-lg-start mb-6 mb-lg-0">
							<div className="col-lg-5 order-0 order-lg-1">
								<img
									className="feature-image img-fluid mb-9 mb-lg-0 d-dark-none"
									src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759100947/undraw_schedule_ry1w-removebg-preview_anlles.png"
									height="394"
									alt="Revenue"
								/>
							</div>
							<div className="col-lg-6">
								<h6 className="text-primary mb-2 ls-2">LOGISTICS</h6>
								<h3 className="fw-bolder mb-3">Impeccable Schedule & Logistics</h3>
								<p className="mb-4 px-md-7 px-lg-0">
									Sync your Appointments with Google/Microsoft Calendar. Use an interactive map to set the exact location for court dates or meetings.
								</p>
							</div>
						</div>
						<div className="row mt-2 align-items-center justify-content-between text-center text-lg-start mb-6 mb-lg-0">
							<div className="col-lg-5">
								<img
									className="feature-image img-fluid mb-9 mb-lg-0 d-dark-none"
									src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759101354/undraw_real-time-collaboration_bchs-removebg-preview_gjknua.png"
									height="394"
									alt="Illustration showing reports"
								/>
							</div>
							<div className="col-lg-6 text-center text-lg-start">
								<h6 className="text-primary mb-2 ls-2">COMMUNICATION</h6>
								<h3 className="fw-bolder mb-3">Encrypted Client Communication Hub</h3>
								<p className="mb-4 px-md-7 px-lg-0">
									End the risk of scattered communication. Centralize all client chats, file shares, and notes within LexQuo's secure, end-to-end encrypted messenger. Maintain a complete, privileged record of all client interaction automatically.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>
			<div className="position-relative">
				<div className="bottom-0 start-0 end-0 bg-body-emphasis">
					<svg className="w-100" viewBox="0 0 1920 368" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path className="fill-body-bg" d="M1920 0.44L0 367.74V0H1920V0.44Z" />
					</svg>
				</div>
				<section className="pb-5 bg-body-emphasis overflow-hidden position-static">
					<div className="container-small px-lg-7 px-xxl-3">
						<div className="row">
							<div className="col-lg-6 mb-6 text-center text-lg-start z-2">
								<h4 className="text-primary fw-bolder mb-3">Testimonial</h4>
								<h2 className="mb-3 text-body-emphasis">
									More than 2 Millions happy
									<br />
									Customers and counting
								</h2>
								<p className="mb-5">
									You may now concentrate on the functionality and other
									<br className="d-none d-sm-block" />
									aspects of your web products thanks to Phoenix's strength
									<br className="d-none d-sm-block" />
									before leaving the UI design to us. It is simple to complete
									<br className="d-none d-sm-block" />
									the work after checking and double-checking.
								</p>
							</div>
							<div className="col-lg-6 z-2">
								<div className="carousel slide" id="carouselExampleIndicators" data-bs-ride="carousel">
									<div className="carousel-inner">
										<div className="carousel-item">
											<div className="row g-1 g-lg-0 g-xl-1 pb-lg-3 pb-xl-0 ps-lg-1 ps-xl-0">
												<div className="col-lg-6 col-xl-5 text-center">
													<div className="testimonial-avatar-container d-inline-block position-relative">
														<div
															className="bg-holder"
															style={{
																backgroundImage: 'url(https://prium.github.io/phoenix/v1.23.0/assets/img/bg/bg-2.png)',
																backgroundSize: 'contain'
															}}
														/>
														<img
															className="rounded-3 mb-lg-0 opacity-100 position-relative"
															src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759105604/pexels-anastasia-shuraeva-8074612_b5c22g.jpg"
															width="153"
															height="153"
															alt="Monica Gomez profile"
														/>
													</div>
												</div>
												<div className="col-lg-6 col-xl-7 text-center text-lg-start">
													<div className="mb-4" data-bs-theme="light">
													</div>
													<h3 className="fs-7 fs-xl-6 mb-5 lh-sm me-md-7 me-lg-0">
														"LexQuo has transformed my solo practice. Centralized, encrypted communication gives me the peace of mind I need for my high-confidentiality clients. I save at least 10 administrative hours a week."
													</h3>
													<h6>Monica Gomez</h6>
													<h6 className="fw-normal">Lawyer, Google</h6>
												</div>
											</div>
										</div>
										<div className="carousel-item">
											<div className="row g-1 g-lg-0 g-xl-1 pb-lg-3 pb-xl-0 ps-lg-1 ps-xl-0">
												<div className="col-lg-6 col-xl-5 text-center">
													<div className="testimonial-avatar-container d-inline-block position-relative">
														<div
															className="bg-holder"
															style={{
																backgroundImage: 'url(https://prium.github.io/phoenix/v1.23.0/assets/img/bg/bg-2.png)',
																backgroundSize: 'contain'
															}}
														/>
														<img
															className="rounded-3 mb-lg-0 opacity-100 position-relative"
															src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759105605/pexels-apf1uk-697509_uszd8i.jpg"
															width="154"
															alt="Marc Chiasson profile"
														/>
													</div>
												</div>
												<div className="col-lg-6 col-xl-7 text-center text-lg-start">
													<div className="mb-4" data-bs-theme="light">
													</div>
													<h3 className="fs-7 fs-xl-6 mb-5 lh-sm me-md-7 me-lg-0">
														“The AI for summarizing complex documents is incredible. I get the key points from the 'court file' in minutes. This allows me to focus on case strategy, not mass file review.”
													</h3>
													<h6>Marc Chiasson</h6>
													<h6 className="fw-normal">Lawyer, Adobe</h6>
												</div>
											</div>
										</div>
										<div className="carousel-item active">
											<div className="row g-1 g-lg-0 g-xl-1 pb-lg-3 pb-xl-0 ps-lg-1 ps-xl-0">
												<div className="col-lg-6 col-xl-5 text-center">
													<div className="testimonial-avatar-container d-inline-block position-relative">
														<div
															className="bg-holder"
															style={{
																backgroundImage: 'url(https://prium.github.io/phoenix/v1.23.0/assets/img/bg/bg-2.png)',
																backgroundSize: 'contain'
															}}
														/>
														<img
															className="rounded-3 mb-lg-0 opacity-100 position-relative"
															src="https://res.cloudinary.com/doxdmmj1o/image/upload/v1759105605/pexels-wasinpirom-31880922_wzok2u.jpg"
															width="154"
															alt="Axel Barry profile"
														/>
													</div>
												</div>
												<div className="col-lg-6 col-xl-7 text-center text-lg-start">
													<div className="mb-4" data-bs-theme="light">
													</div>
													<h3 className="fs-7 fs-xl-6 mb-5 lh-sm me-md-7 me-lg-0">
														"The payment system and calendar synchronization are seamless and reliable. I've never missed a high-priority deadline again. An essential tool for maintaining my legal organization”
													</h3>
													<h6>Axel Barry</h6>
													<h6 className="fw-normal">Lawyer, Apple</h6>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
		</PublicLayout>
	)
}; 
