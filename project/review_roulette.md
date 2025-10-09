# Review Roulette - Landmark Guessing Game

## Application description

Review Roulette is a competitive multiplayer game where players guess famous landmarks based solely on their Google reviews. The twist: reviews are revealed progressively from worst to best (1-star to 5-star), with higher points awarded for earlier correct guesses. Players compete in real-time to identify locations faster than their opponents.

## Work scope

The application has a few different actors with associated workflows. The lists below would be the output of some initial workshops to investigate the domain.  
It should be further refined into various tasks and sub-tasks as part of the project.

The workflows are in a prioritised order, where the top ones are more important than the bottom ones. There are intentionally more work available than the average group is expected to be able to finish, but you are expected to complete a majority of workflows for all actors. You should *not* attempt to finish *all* workflows for one actor before moving on to the next actor, but complete work from the different workflow in a way that makes sense, both for you and for the project.

There is also a list of technical requirements. The first half of that list must be implemented to get a passing grade.

**The advanced requirements are not necessary to get a passing grade, but to be considered a delivery of very good or excellent performance at least two or three advanced requirements need to be implemented.**

## Actors and workflows

The following actors exist in the system:

### Player

Person who plays the game and competes to guess landmarks.

#### *Workflows*

* Register as a player with username and basic profile information.
* Log in to the site.
* Complete their profile with optional information (favorite regions, avatar).
* Join quick match queue (matched with random players of similar skill).
* Create a custom lobby with shareable join code.
* Join a custom lobby using a join code.
* View the game lobby while waiting for other players (shows joined players, ready status).
* Mark themselves as ready in the lobby.
* Play the game:
  * See reviews revealed progressively (1-star first, then 2-star, etc.).
  * Each review stage has a time limit (configurable, default 30 seconds).
  * Submit a guess by clicking on the map or typing location name.
  * Can only submit one guess per review level (once per 1-star, once per 2-star, etc.).
  * See if their guess was correct and how many points they earned.
  * See other players' scores updating in real-time.
  * See the correct answer revealed at the end of each round.
* View the game results screen showing:
  * Final scores and rankings
  * All landmarks that were featured
  * Points earned per round
  * Correct/incorrect guess breakdown
* Rate the game difficulty after completion.
* View their player statistics:
  * Total games played
  * Win rate
  * Average points per game
  * Best score
  * Favorite regions (where they guess correctly most often)
  * Current ranking/rating (ELO-based)
* View global and regional leaderboards (daily, weekly, all-time).
* View their match history with detailed round-by-round results.
* Challenge specific players to a rematch.
* Participate in daily challenges (everyone plays same landmarks, separate leaderboard).

### Game Master / Host

A player who creates and hosts custom games with specific settings (extends Player role).

#### *Workflows*

* Create a custom lobby with settings:
  * Number of rounds (3, 5, 10, 15)
  * Time limit per review level (15, 30, 45, 60 seconds)
  * Region restrictions (worldwide, specific continent, specific country)
  * Difficulty level (very famous → obscure landmarks)
  * Category filter (museums, restaurants, natural landmarks, historical sites, etc.)
  * Private or public lobby
* Pre-select specific landmarks for the game (optional, otherwise random).
* Invite players by sharing join code or direct invite.
* Start the game when enough players have joined and are ready.
* Kick players from lobby before game starts (for disruptive behavior).
* Act as Game Master during the game:
  * Can pause/resume if needed
  * Can skip a landmark if it's inappropriate or broken
  * Can view all players' guesses in real-time
* View analytics for hosted games:
  * Which landmarks were hardest/easiest
  * Player feedback on difficulty
  * Completion rates

### Administrator

Person who moderates the platform and manages content.

#### *Workflows*

* Separate login from players.
* No self-registration; application starts with a single administrator.
* Password must be changed on first login.
* Dashboard showing platform statistics:
  * Total active players
  * Games in progress
  * Games completed today/this week/this month
  * Most popular regions and categories
  * Average game duration
* Manage the landmark database:
  * View cached landmarks with their reviews
  * Mark landmarks as inappropriate or broken
  * Manually add or remove landmarks from rotation
  * Set difficulty ratings for landmarks
  * Categorize landmarks (if not using Google Places categories)
* Manage review content:
  * Flag inappropriate reviews
  * Filter out spam or irrelevant reviews
  * Set review quality thresholds
* Handle player reports:
  * Review reported usernames or behavior
  * Issue warnings or bans
  * View report history per player
* Manage the landmark selection algorithm:
  * Adjust difficulty distribution
  * Set minimum review counts for inclusion
  * Configure region weights for random selection
* View API usage and costs (Google Maps API):
  * Daily/monthly request counts
  * Cost projections
  * Cache hit rates
* Send platform-wide announcements.
* Invite new administrators to the platform.
* View and respond to player feedback.

## Game Mechanics

### Scoring System

* **Guess from 1-star review:** 5 points
* **Guess from 2-star review:** 4 points
* **Guess from 3-star review:** 3 points
* **Guess from 4-star review:** 2 points
* **Guess from 5-star review:** 1 point
* **No correct guess:** 0 points

### Review Progression

* Game shows one review at a time, starting with a 1-star review
* Time limit per review (default 30 seconds)
* After time expires or all players have guessed, next review level is shown
* Continues until a player guesses correctly or all 5 levels are exhausted
* If no one guesses correctly after 5-star review, answer is revealed and no points awarded

### Guess Validation

* Player clicks on map or types location name
* Guess is correct if within a certain distance threshold (e.g., 50km for cities, 5km for specific buildings)
* Distance threshold adjusts based on landmark type:
  * Countries: more lenient (within borders)
  * Cities: medium (50km radius)
  * Specific buildings: strict (5km radius)
  * Natural landmarks: medium (20km radius)

### Multiple Rounds

* Standard game has multiple rounds (default: 5 rounds)
* Each round features a different landmark
* Points accumulate across rounds
* Winner is player with highest total score

## Technical requirements

The application should be a web application.

The application should use a form of database.

Players should be able to register and create profiles.

The application must integrate with Google Maps Platform APIs:

* Places API for landmark data and reviews
* Maps JavaScript API for the map interface

Review data should be cached to minimize API costs:

* Cache reviews for landmarks for a reasonable period (e.g., 30 days)
* Pre-fetch and cache popular landmarks during off-peak hours
* Implement cache invalidation strategy

Real-time gameplay requires WebSocket connection:

* Game state updates (review reveals, timer countdown)
* Player guess submissions
* Live score updates
* Player join/leave notifications

The application should handle concurrent games:

* Multiple game sessions running simultaneously
* Proper game state isolation per session
* Efficient resource management

The application should be able to run from a freshly cloned repository using Docker and docker-compose with a simple batch script or `docker-compose up`.

Using GitHub workflows, automated tests should run on every check-in of code.

The database should be seeded with demo/test data including:

* Sample player accounts with varying statistics
* Cached landmark data with reviews
* Sample completed games for testing leaderboards
* Admin account with known password

### Advanced requirements

Rating/ranking system with ELO or similar algorithm:

* Players gain/lose rating based on performance against opponents
* Matchmaking uses ratings to pair similarly-skilled players
* Separate ratings for different regions or categories

Daily challenges:

* One set of landmarks for all players each day
* Separate leaderboard for daily challenge
* Async play (players can play anytime during the day)
* Archive of previous daily challenges

Tournament mode:

* Bracket-based elimination tournaments
* Scheduled tournament events
* Prize badges or achievements for winners
* Tournament history and statistics

Hint system:

* Players can request hints (costs points or uses limited currency)
* Hints could reveal: continent, country, landmark category, or nearby landmarks
* Strategic decision: use hint early vs. risk zero points

Spectator mode:

* Allow non-players to watch ongoing games
* Real-time view of players' guesses and scores
* Chat for spectators
* Featured games on homepage

Achievement and progression system:

* Unlock badges for various accomplishments (10 wins, guess from 1-star 5 times, etc.)
* Player levels based on experience points
* Cosmetic rewards (avatars, map themes, profile decorations)

Social features:

* Friend system
* Challenge friends to specific game modes
* Share results on social media
* Game replay feature with shareable links

Advanced landmark selection:

* Machine learning to predict landmark difficulty based on review characteristics
* Avoid recently played landmarks for individual players
* Balanced rotation ensuring variety
* Community-submitted landmark suggestions with voting

Push notifications for:

* Game invitations
* Tournament starting soon
* Friend online and available to play
* Daily challenge available

Analytics dashboard for players:

* Detailed statistics on performance by region, category, time of day
* Guess accuracy heat map on world map
* Improvement tracking over time
* Compare stats with friends
