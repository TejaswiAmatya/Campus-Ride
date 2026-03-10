# Campus Ride - Ride Share System

## Application description

Campus Ride is a ride-sharing platform specifically designed for students and staff to share rides to/from campus or between campus locations. Drivers can offer available seats in their vehicles, and passengers can search for and book rides that match their route and schedule. The platform facilitates both one-time rides and recurring ride arrangements (like daily commutes), helping reduce traffic, parking demand, and transportation costs.

## Work scope

The application has a few different actors with associated workflows. The lists below would be the output of some initial workshops to investigate the domain.

It should be further refined into various tasks and sub-tasks as part of the project.

The workflows are in a prioritised order, where the top ones are more important than the bottom ones. There are intentionally more work available than the average group is expected to be able to finish, but you are expected to complete a majority of workflows for all actors. You should *not* attempt to finish *all* workflows for one actor before moving on to the next actor, but complete work from the different workflow in a way that makes sense, both for you and for the project.

There is also a list of technical requirements. The first half of that list must be implemented to get a passing grade.

**The advanced requirements are not necessary to get a passing grade, but to be considered a delivery of very good or excellent performance at least two or three advanced requirements need to be implemented.**

## Actors and workflows

The following actors exist in the system:

### User (Base)

Any person using the platform. Both drivers and passengers share these basic capabilities.

#### *Workflows*

* Register as a user with basic information (name, email, phone number).
* Log on to site.
* Complete their profile:
  * Upload profile photo
  * Add vehicle information (make, model, colour, license plate) if planning to drive
  * Set home and campus addresses
  * Add bio/description
  * Verify student/staff status (upload ID or use university email)
* View and edit their profile.
* View their ride history (as both driver and passenger).
* Rate and review other users after rides.
* View their own ratings and reviews.
* Report problematic users or rides.
* Manage notification preferences.
* Delete their account.

### Passenger

Person looking for rides.

#### *Workflows*

* Search for available rides:
  * Enter departure location (or select from map)
  * Enter destination (or select from map)
  * Select date and preferred time window
  * Filter by: price range, driver rating, number of stops, detour tolerance
  * View results sorted by: departure time, price, rating, route match quality
* View ride details:
  * Driver profile and ratings
  * Exact pickup and drop-off points on map
  * Estimated route and duration
  * Price per seat
  * Number of available seats
  * Other confirmed passengers (if any)
  * Vehicle information
* Request to book a seat on a ride:
  * Specify exact pickup and drop-off points (can differ from ride's start/end)
  * Add optional message to driver
* View status of booking requests (pending, accepted, declined).
* Cancel a booking:
  * Free cancellation up to 2 hours before departure
  * Partial refund (50%) for cancellation within 2 hours
  * No refund for no-shows
* Pay for rides using the platform (start with simulating payment, replace implementation if doing advanced requirement).
* View upcoming rides with details.
* Receive notifications:
  * Booking accepted/declined
  * Ride details changed by driver
  * Reminder 1 hour before pickup
  * Driver is approaching pickup location
* Check in when picked up (confirms ride started).
* Leave tip for driver after ride (optional).
* Leave rating and review for driver after ride.
* Save favourite routes and enable alerts for matching rides.
* Set up recurring ride requests (e.g., need ride every Monday/Wednesday/Friday at 8 AM).

### Driver

Person offering rides in their vehicle.

#### *Workflows*

* Register as a driver:
  * Verify driver's license (upload photo)
  * Verify vehicle insurance (upload document)
  * Add vehicle details (required for insurance)
  * Accept terms and conditions
* View status of driver registration (pending, approved, rejected by admin).
* Create a ride offer:
  * Set departure location and time
  * Set destination
  * Add optional waypoints/stops
  * Set number of available seats
  * Set price per seat (or free)
  * Specify detour flexibility (willing to detour up to X km)
  * Add preferences (no smoking, no food, quiet ride, etc.)
  * Set as one-time or recurring (daily, weekly, specific days)
  * Preview route on map
* Edit upcoming ride offers (if no confirmed passengers, or send update notification if passengers confirmed).
* Cancel ride offers:
  * Free to cancel if no confirmed passengers
  * Must notify passengers if any confirmations exist
  * Frequent cancellations affect driver rating
* View and manage passenger booking requests:
  * See pickup/drop-off points on map
  * View passenger profile and rating
  * Accept or decline requests
  * Send message to passenger
* View confirmed passengers for each ride.
* Modify ride if needed (time, route) and notify passengers.
* Start ride (check in when departing).
* Mark passengers as picked up.
* Complete ride and mark as finished.
* Rate and review passengers after ride.
* View earnings summary:
  * Per ride breakdown
  * Weekly/monthly totals
  * Pending payments
  * Payment history
* Drivers keep 90% of the ride fare, platform takes 10% service fee.
* View driver-specific statistics:
  * Total rides given
  * Total distance driven
  * Average rating
  * CO2 savings estimate
  * Reliability score (completed vs. cancelled rides)

### Administrator

Person who moderates the platform and ensures safety.

#### *Workflows*

* Separate login from regular users.
* No self-registration; application starts with a single administrator.
* Default password must be changed on first login.
* Dashboard showing platform statistics:
  * Total active users (drivers, passengers)
  * Rides offered today/this week/this month
  * Rides completed vs. cancelled
  * New driver applications pending review
  * Active reports needing attention
  * Revenue metrics (platform fees collected)
  * User growth trends
* Review and approve/reject driver applications:
  * Verify license and insurance documents
  * Check for any red flags in application
  * Send approval or rejection notification with reason
* Handle user reports:
  * Review reported incidents
  * View involved users' history and ratings
  * Issue warnings to users
  * Suspend or ban users if necessary
  * Document resolution
* Monitor platform health:
  * Identify users with suspicious activity
  * Track frequent cancellations
  * Monitor rating anomalies
  * View most active routes and times
* Manage platform settings:
  * Set cancellation policy parameters
  * Adjust service fee percentage
  * Set minimum/maximum prices per kilometre
  * Configure distance matching tolerance
* Send platform-wide announcements or notifications.
* View financial reports:
  * Total transactions
  * Platform fees collected
  * Outstanding payments
  * Refunds issued
* Invite new administrators to the platform.
* Export data for analysis (anonymized ride data, usage patterns).

## Technical requirements

The application should be a web application.

The application should use a form of database.

Users should be able to register with email verification.

Driver registration requires document uploads (license, insurance) for admin verification.

Ride matching algorithm should consider:

* Route overlap between offered ride and passenger request
* Time window compatibility
* Available seats
* Price range
* Ratings/preferences

The booking system should prevent overbooking:

* Seats should be decremented atomically when bookings are confirmed
* Handle concurrent booking requests properly
* Prevent race conditions

Map integration for:

* Selecting pickup/drop-off locations
* Displaying ride routes
* Showing distance and estimated time
* Can use any mapping service (Google Maps, OpenStreetMap, Mapbox, etc.)

The application should be able to run from a freshly cloned repository using Docker and docker-compose with a simple batch script or `docker-compose up`.

Using GitHub workflows, automated tests should run on every check-in of code.

The database should be seeded with demo/test data including:

* User accounts (passengers and verified drivers)
* Pending driver applications
* Sample rides in various states (upcoming, in-progress, completed)
* Bookings in various states (pending, confirmed, completed)
* Sample ratings and reviews
* Admin account with known password

### Advanced requirements

Real-time location tracking during active rides:

* Drivers share location when ride is active
* Passengers can see driver approaching on map
* Estimated arrival time updates based on real location
* WebSockets or similar technology for real-time updates

Integration with external mapping APIs for:

* Route optimization
* Real-time traffic data
* Accurate travel time estimates
* Turn-by-turn navigation

Payment integration with external service (Stripe, PayPal, or similar):

* Secure payment processing
* Automatic payment splits (90% to driver, 10% to platform)
* Refund handling for cancellations
* Payment escrow (hold payment until ride completes)

Push notifications for:

* Booking requests for drivers
* Booking acceptance/rejection for passengers
* Ride reminders
* Driver approaching pickup location
* Ride started/completed
* Payment received

Email notifications for key events:

* Registration confirmation
* Driver approval/rejection
* Ride booking confirmations
* Ride cancellations
* Weekly ride summary
* Sending of emails should be done asynchronously by a separate application subscribing to events/queues.

In-app messaging system:

* Direct messages between driver and passengers for a ride
* Chat history per ride
* Real-time message delivery (WebSockets)

Recurring ride matching:

* Passengers can set recurring needs (e.g., Monday/Wednesday/Friday 8 AM)
* System automatically matches with recurring ride offers
* Both parties get matched for entire series or can approve individually

Carbon footprint calculator:

* Show CO2 saved per ride vs. driving alone
* User dashboard showing total environmental impact
* Platform-wide statistics on emissions reduced

Smart pricing suggestions:

* Recommend competitive prices based on distance and demand
* Show average prices for similar routes
* Dynamic pricing during high-demand times

Social features:

* Create ride groups with friends/classmates
* Preferred driver/passenger lists
* Share ride details with emergency contacts
* Verified user badges (student ID verified, long-time user, etc.)
