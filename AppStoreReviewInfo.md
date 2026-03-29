# App Store Review Information - Rest & Recharge v1.0.1

---

## 2. App Purpose

Rest & Recharge is a rest management app primarily designed for people living with chronic illness - particularly Long COVID, ME/CFS (Myalgic Encephalomyelitis / Chronic Fatigue Syndrome), and chronic fatigue. It also serves anyone dealing with burnout or who wants to build healthier rest habits into their day.

**Problem it solves:**
People with energy-limiting conditions need to pace themselves carefully throughout the day to avoid post-exertional malaise and symptom flare-ups. Without structured rest breaks, it is easy to overexert and crash. There are very few tools specifically built to support this kind of intentional pacing. Rest & Recharge fills that gap by providing timed rest reminders, session tracking, and a motivational reward system that makes consistent resting feel rewarding rather than like a chore.

**Value it provides:**
- **Timed rest sessions** - Users start a countdown timer (configurable duration, default 20 minutes) and close their eyes to rest. The timer continues in the background and notifies the user when the session is complete.
- **Smart reminders** - Configurable interval-based notifications remind users to take their next rest (default every 2 hours). Users log their wake-up time each morning, and reminders are scheduled from that point onward throughout the day.
- **Activity tracking** - A home dashboard tracks daily rest sessions, wake-up times, streaks, and progress toward a configurable daily goal - helping users see whether they are pacing well.
- **Virtual garden** - A gamification layer where completing rest sessions earns energy to grow virtual flowers. Users unlock new flower types (sunflower, daisy, tulip, rose, lavender, lily, orchid, poppy) as they accumulate total rest sessions. Flowers progress through growth stages (seed → sprout → young → blooming → full bloom) and wilt if neglected, encouraging consistent rest habits.
- **Personalized onboarding** - Users select their purpose (work, study, health & recovery, general wellness) and indicate their health condition (chronic fatigue, ME/CFS, post-COVID recovery, burnout, or none) to personalize the experience.
- **iOS Live Activity** - A Live Activity widget displays the active timer countdown on the Lock Screen for easy monitoring without needing to open the app.

The primary intended audience is people managing Long COVID, ME/CFS, chronic fatigue, and burnout. The app is also useful for office workers, students, and anyone who wants to build regular rest breaks into their routine.

---

## 3. Review Instructions

**No login or account is required.** The app is fully functional without any authentication.

### How to review the main features:

1. **Onboarding** - On first launch, you will see a brief onboarding flow. Select any purpose, health condition (or "None of these"), and set a wake-up time. Tap through to complete onboarding.

2. **Home Screen (Activity tab)** - After onboarding, you arrive at the Home screen.
   - The screen shows today's rest activity, a weekly calendar, and your current streak.
   - Tap the **"+"** button to manually log a rest session at any time.
   - Tap the bell icon area to view or edit your next rest reminder.

3. **Timer Screen (middle tab)** - Tap the stopwatch icon in the bottom tab bar.
   - Press **Start** to begin a rest timer. The screen enters "rest mode" (dark theme) and the timer counts down.
   - You can lock your screen - the timer continues in the background. On iOS, a Live Activity shows the countdown on the Lock Screen.
   - When the timer completes, an alarm goes off or a notification is shown, depending on IOS version and AlarmKit support. Completing rests earns energy for your garden.
   - Tap **Cancel** at any time to stop early (partial energy is still awarded).

4. **Garden Screen (sun icon tab)** - Tap the sun icon in the bottom tab bar.
   - View your virtual garden
   - Tap an empty plot to plant a flower from your unlocked collection.
   - Flowers grow through 5 stages as you complete rest sessions. They wilt if energy drops.
   - Tap the list icon to see a timeline of all flower types and their unlock requirements.
   - New flowers unlock as your total rest count increases (e.g., Daisy at 5 rests, Tulip at 10, etc.).

5. **Settings** - Tap the gear icon (top-right of Timer screen or Home screen).
   - Adjust rest interval, rest duration, daily goal, notification preferences, and profile settings.
   - "Reset All Data" at the bottom clears all progress and returns to onboarding.

### Tips for efficient review:
- To see the garden progression quickly, log several manual rests via the "+" button on the Home screen. Each rest earns energy and counts toward flower unlocks.
- The first flower (Sunflower) is unlocked immediately. The second (Daisy) unlocks at 5 total rests.

---

## 4. External Services, Tools & Platforms

**Rest & Recharge does not use any external services, APIs, third-party data providers, authentication services, payment processors, or AI services.**

All functionality is entirely local to the device:
- **Data storage** - AsyncStorage (on-device key-value storage) is used for all user data, settings, rest history, and garden progress. No data is sent to or stored on any server.
- **Notifications** - Local push notifications only (react-native-push-notification / @react-native-community/push-notification-ios). No remote push notification server (APNs) is used.
- **Live Activity** - iOS WidgetKit Live Activity for the timer countdown, powered entirely by local data via native Swift/Objective-C bridge.

No analytics, crash reporting, or telemetry SDKs are included.

---

## 5. Regional Differences

**The app functions consistently across all regions.** There are no regional differences in features, content, or functionality. All content is in English and all features are available identically regardless of the user's location.

---

## 6. Regulated Industry

**Not applicable.** Rest & Recharge is a general wellness and habit-building app. It does not provide medical advice, diagnoses, or treatment. The health condition options in the profile (chronic fatigue, ME/CFS, post-COVID recovery, burnout) are used solely to personalize reminder settings and are stored locally on the device. The app does not claim to treat or cure any medical condition.

No specialized licenses, certifications, or regulatory documentation are required.
