import ActivityKit
import WidgetKit
import SwiftUI

struct TimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerAttributes.self) { context in
            // Lock screen/banner UI - clean white/transparent style
            let isCompleted = context.state.endTime <= Date()
            let totalDuration = TimeInterval(context.attributes.totalDuration)

            HStack(spacing: 16) {
                // App logo on the left
                ZStack {
                    Circle()
                        .fill(Color(red: 0.30, green: 0.36, blue: 0.42).opacity(0.1))
                        .frame(width: 48, height: 48)
                    
                Image("WidgetLogo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 40, height: 40)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Eye Rest")
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundColor(Color(red: 0.18, green: 0.20, blue: 0.22))

                    if context.state.isPaused {
                        Text("Paused")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color(red: 0.45, green: 0.50, blue: 0.55))
                    } else if isCompleted {
                        Text("Rest complete")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color(red: 0.45, green: 0.50, blue: 0.55))
                    } else {
                        Text("Rest & Recharge")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Color(red: 0.45, green: 0.50, blue: 0.55))
                    }
                }

                Spacer()

                // Circular progress indicator on the right
                ZStack {
                    // Progress circle - ProgressView has its own background
                    if !isCompleted {
                        ProgressView(timerInterval: Date()...context.state.endTime, countsDown: true, label: {}, currentValueLabel: {})
                            .progressViewStyle(CircularProgressViewStyle(tint: Color(red: 0.30, green: 0.73, blue: 0.42)))
                            .frame(width: 60, height: 60)
                    } else {
                        Circle()
                            .stroke(Color(red: 0.30, green: 0.73, blue: 0.42), lineWidth: 4)
                            .frame(width: 60, height: 60)
                    }
                    
                    // Timer text in center - MM:SS format
                    if context.state.isPaused {
                        let seconds = max(0, context.state.remainingSeconds)
                        let mins = seconds / 60
                        let secs = seconds % 60
                        Text(String(format: "%02d:%02d", mins, secs))
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundColor(Color(red: 0.18, green: 0.20, blue: 0.22))
                            .monospacedDigit()
                            .frame(width: 50)
                    } else if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(Color(red: 0.30, green: 0.73, blue: 0.42))
                    } else {
                        Text(timerInterval: Date()...context.state.endTime, countsDown: true)
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundColor(Color(red: 0.18, green: 0.20, blue: 0.22))
                            .monospacedDigit()
                            .multilineTextAlignment(.center)
                            .frame(width: 50)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(Color.white.opacity(0.92))
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.12), radius: 16, x: 0, y: 6)
            )
            .activityBackgroundTint(Color.clear)
            .activitySystemActionForegroundColor(Color(red: 0.30, green: 0.36, blue: 0.42))
            
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
