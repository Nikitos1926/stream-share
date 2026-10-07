# ABSTRACT

Kabakov N. S. Web service for streaming media content with the function of capturing individual
applications : bachelor's qualification work in the specialty «121 Software Engineering» / Nikita
Serhiiovych Kabakov ; supervisor [ПОТРЕБУЄ УТОЧНЕННЯ: Name Patronymic Surname]. – Odesa : Odesa Polytech. Nat.
Univ., [ПОТРЕБУЄ УТОЧНЕННЯ: year]. – [ПОТРЕБУЄ УТОЧНЕННЯ: total number of pages after layout] p.

The qualification work contains the main text part on [ПОТРЕБУЄ УТОЧНЕННЯ: number after layout]
pages, a list of used sources with 30 titles on [ПОТРЕБУЄ УТОЧНЕННЯ: number after layout] pages,
appendices on [ПОТРЕБУЄ УТОЧНЕННЯ: number after layout] pages.

The purpose of the qualification work is to improve the efficiency of broadcasting individual
applications by developing a media streaming web service with a desktop capture application that
delivers to viewers in the browser the picture and own sound of the selected application only and,
without any action from the streamer, switches the broadcast to a new window of that application
within 1.5 s.

The work analyses media delivery technologies, multiparty transmission topologies and the
limitations of screen capture in the browser, compares four existing solutions and identifies the
niche of the service. Functional and non-functional requirements are formulated, the development
effort is estimated with the use case points method, and a schedule and a risk register are drawn
up. The architecture consisting of a web application, a signaling server with an SFU media server
and a desktop application, the signaling protocol, the data model and the server classes are
designed.

As a result, a software system was created in which the Electron desktop application captures the
selected window together with the audio of only the process that owns it and automatically switches
the stream to new windows of the same application, the mediasoup-based server forwards the stream to
viewers over WebRTC, and a viewer watches the stream in the browser, including as a guest without an
account. Static verification passed for all packages, 27 of 30 automated functional test cases
produced the expected result, and the detected authorization defects of the signaling server are
identified as a direction for further work. The service is deployed and available on the Internet.

Keywords: web service, media streaming, live streaming, application capture, process audio capture,
WebRTC, SFU, mediasoup, Electron, Next.js, TypeScript, PostgreSQL.
