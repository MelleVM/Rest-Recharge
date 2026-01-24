import ActivityKit
import WidgetKit
import SwiftUI

struct TimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerAttributes.self) { context in
            // Lock screen/banner UI
            HStack(spacing: 16) {
                // Eye icon
                ZStack {
                    Circle()
                        .fill(Color(red: 0.3, green: 0.6, blue: 0.9))
                        .frame(width: 50, height: 50)
                    
                    Text("👁️")
                        .font(.system(size: 24))
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Eye Rest in Progress")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    if context.state.isPaused {
                        Text("Paused")
                            .font(.subheadline)
                            .foregroundColor(.orange)
                    } else {
                        Text(context.state.endTime, style: .timer)
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                            .monospacedDigit()
                    }
                }
                
                Spacer()
            }
            .padding(16)
            .activityBackgroundTint(Color.white.opacity(0.95))
            .activitySystemActionForegroundColor(Color.blue)
            
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    Text("👁️")
                        .font(.system(size: 32))
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    if context.state.isPaused {
                        Text("⏸️")
                            .font(.system(size: 24))
                    }
                }
                
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 4) {
                        Text("Eye Rest")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        if context.state.isPaused {
                            Text("Paused")
                                .font(.title3)
                                .fontWeight(.semibold)
                        } else {
                            Text(context.state.endTime, style: .timer)
                                .font(.title2)
                                .fontWeight(.bold)
                                .monospacedDigit()
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Spacer()
                        Text("Close your eyes and relax")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                }
            } compactLeading: {
                Text("👁️")
                    .font(.system(size: 16))
            } compactTrailing: {
                if context.state.isPaused {
                    Text("⏸️")
                        .font(.system(size: 12))
                } else {
                    Text(context.state.endTime, style: .timer)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .monospacedDigit()
                        .frame(width: 40)
                }
            } minimal: {
                Text("👁️")
                    .font(.system(size: 14))
            }
        }
    }
}
