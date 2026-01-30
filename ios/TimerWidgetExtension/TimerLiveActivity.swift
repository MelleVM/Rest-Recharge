import ActivityKit
import WidgetKit
import SwiftUI

struct TimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerAttributes.self) { context in
            // Lock screen/banner UI - modern dark style like WWDC example
            let now = Date()
            let isCompleted = context.state.endTime <= now

            HStack(spacing: 14) {
                // App icon - using SF Symbol
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.white.opacity(0.2))
                        .frame(width: 42, height: 42)
                    
                    Image(systemName: "eye.fill")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundColor(.white)
                }
                .shadow(color: Color.black.opacity(0.18), radius: 6, x: 0, y: 3)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Eye Rest")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundColor(.white)

                    if context.state.isPaused {
                        Text("Paused")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.85))
                    } else if isCompleted {
                        Text("Rest complete")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.85))
                    } else {
                        Text("Rest & Recharge")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.85))
                    }
                }

                Spacer()

                // Timer display
                VStack(alignment: .trailing, spacing: 4) {
                    if context.state.isPaused {
                        let seconds = max(0, context.state.remainingSeconds)
                        let mins = seconds / 60
                        let secs = seconds % 60
                        HStack(spacing: 6) {
                            Image(systemName: "pause.circle.fill")
                                .font(.system(size: 14))
                                .foregroundColor(.white.opacity(0.9))
                            Text(String(format: "%02d:%02d", mins, secs))
                                .font(.system(size: 22, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                                .monospacedDigit()
                        }
                    } else if isCompleted {
                        Text("Finished!")
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.trailing)
                    } else {
                        // Use timer interval for smooth countdown
                        Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .monospacedDigit()
                            .multilineTextAlignment(.trailing)
                    }

                    Text(context.state.isPaused ? "Paused" : (isCompleted ? "Completed" : "Relax your eyes"))
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.85))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color(red: 0.50, green: 0.73, blue: 1.00),
                                Color(red: 0.99, green: 0.76, blue: 0.89)
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(Color.white.opacity(0.18), lineWidth: 1)
                    )
            )
            .activityBackgroundTint(Color.clear)
            .activitySystemActionForegroundColor(.white)
            
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 7)
                            .fill(Color.primary.opacity(0.2))
                            .frame(width: 36, height: 36)
                        Image(systemName: "eye.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.primary)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.isPaused {
                        Image(systemName: "pause.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.secondary)
                    }
                }
                
                DynamicIslandExpandedRegion(.center) {
                    let now = Date()
                    let isCompleted = context.state.endTime <= now

                    VStack(spacing: 3) {
                        Text("Eye Rest")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.secondary)
                        
                        if context.state.isPaused {
                            Text("Paused")
                                .font(.system(size: 18, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)
                        } else if isCompleted {
                            Text("Finished!")
                                .font(.system(size: 20, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)
                                .multilineTextAlignment(.trailing)
                        } else {
                            Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                                .font(.system(size: 20, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)
                                .monospacedDigit()
                                .multilineTextAlignment(.trailing)
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    let now = Date()
                    let isCompleted = context.state.endTime <= now

                    HStack {
                        if !context.state.isPaused && !isCompleted {
                            Text("Time remaining")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 8)
                }
            } compactLeading: {
                Image(systemName: "eye.fill")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.primary)
            } compactTrailing: {
                let now = Date()
                let isCompleted = context.state.endTime <= now

                if context.state.isPaused {
                    Image(systemName: "pause.circle.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                } else if isCompleted {
                    Text("Done")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 38)
                } else {
                    Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                        .monospacedDigit()
                        .multilineTextAlignment(.trailing)
                        .frame(width: 38)
                }
            } minimal: {
                Image(systemName: "eye.fill")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.primary)
            }
        }
    }
}
