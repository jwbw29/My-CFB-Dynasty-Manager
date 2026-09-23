**CAUTION: IF USING THIS VERSION WITH A PREVIOUS SAVE, IT MAY BREAK! THIS WAS REDESIGNED TO BE USED WITH A FRESH DYNASTY**
_If you encounter any bugs or issues, please report them so they can be fixed!_

<ins>**FEATURES:**</ins>

1. Track multiple dynasties!
2. Dark & Light Mode.
3. Team Dashboard - See relevant team data at a quick glance.
4. Schedule - Track your season progress week-by-week! This will populate data elsewhere in the program!
5. Top 25 - Allows for user input of the Top 25 teams week by week. Will show movement of teams via green and red arrows.
6. Roster - Allows for roster input with jersey #, name, position, year, overall, dev. trait and notes. sortable by all fields (except notes). Redshirt button to turn the player red in the roster view to show that they are currently redshirted! Can also import and export Roster via CSV!
7. Player Cards - Click on a player's name to view their player card! This shows all stats, awards, when they were recruited, what star recruit they were, dev trait, and bio (notes)!
8. Recruiting Class Tracker - Enter recruits' name, star rating, position, rating, and potential. Automatically tracked and stored year over year for easy viewability in the future.
9. Transfer Class Tracker - Enter transfers' name, star rating, position, transfer direction(To/From), and dev trait. Automatically tracked and stored year over year for easy viewability in the future.
10. Player Stats - Track stats for players by year. See Season or Career stats for Offense, Defense, or Special Teams.
11. Player Awards - Selectable player awards tracked on a year-to-year basis for easy viewabilty in the future.
12. Season Stats - Current and all past years are selectable. Place to view past seasons and their outcome at a glance!
13. Trophy Case - Enterable Trophies for users to track National Championships, Bowl Games, Conference Championships and Rivalry Games.
14. Social Media - A tab with a social media feed centered around your dynasty!
15. Tools - Recruiting tools to give overall estimates, if you should Hard Sell or not, a Random Name Generator, and an Export function for saving progress!
16. Coach Profile - Can edit team colors, coach name, year, school!
17. Manual Save - There is an autosave feature, but make sure to manually save before you close the app to be sure!

<ins>**HOW TO USE:**</ins><br>

1. First, you need to download [`node.js`](https://nodejs.org/en/download/package-manager/current) on your PC.

2. Download the program [`HERE`](https://github.com/kn1meR/CFB-Dynasty-Manager/releases/tag/CFB27) and extract the folder to your Desktop.

3. Run the `Setup.bat` file.

4. Once the installation is complete, run the `RunCFBDM.bat` file.

5. When you're done using the app, make sure you save and close the app. End the process by pressing `ctrl+c` in the Command Prompt.

## Desktop App (macOS)

The app can also run as a real double-clickable macOS app (`Dynasty Manager.app`) instead of through the dev server.

**Rebuilding after code changes:** This is a manual, on-demand build, the app does not auto-update itself. To rebuild and reinstall:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist
rm -rf "/Applications/Dynasty Manager.app" && cp -R "dist/mac-arm64/Dynasty Manager.app" "/Applications/Dynasty Manager.app"
```

**Storage is separate from dev mode:** The packaged app has its own app identity and its own storage folder, completely separate from `npm run dev`, `RunCFBDM.sh`, and `npm run electron-dev`. This means the first time you launch the packaged app, it will start with an empty dynasty list. That's expected, not a bug, it's simply a fresh, isolated storage location.

**Bringing your existing dynasty data over:** To move dynasties from your dev-mode app into the packaged app:

1. In the OLD/dev-mode app, go to the Tools/Data page and use **Export Current Dynasty** (for a single dynasty) or **Export All Dynasties** (to back up every saved dynasty into one file).
2. Save the downloaded JSON file somewhere you can find it.
3. Open the NEW packaged app and use **Import Dynasty** on the launch screen. It automatically detects whether the file is a single-dynasty export or an all-dynasties bundle, so either export works with the same import flow.

**The dev workflow is unchanged:** Keep using `RunCFBDM.sh` / `npm run electron-dev` to write and test code as you always have. The packaged `.app` is just a separate, on-demand build for daily use once you're happy with a set of changes.

**Technical FYI for maintainers:** The packaged app serves its Next.js static export through a local loopback HTTP server on a fixed port rather than via `file://` URLs (the static export's root-absolute asset paths don't resolve under `file://`, which produced a blank screen). It also sets its own app name so macOS gives it a separate `Application Support` storage folder from the dev-mode app. Both were fixes required specifically for packaging and aren't incidental implementation details.

<ins>**SCREENSHOTS:**</ins>

![2](/public/screenshots/dynastyHome.png)

![3](/public/screenshots/teamHome.png)

![4](/public/screenshots/schedule.png)

![5](/public/screenshots/roster.png)

![6](/public/screenshots/top25.png)

![7](/public/screenshots/stats.png)

![8](/public/screenshots/records.png)

![9](/public/screenshots/seasonHistory.png)

![10](/public/screenshots/awards.png)

![11](/public/screenshots/trohpyCase.png)

![12](/public/screenshots/recruiting.png)

![13](/public/screenshots/editCoach.png)
