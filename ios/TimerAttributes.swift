import Foundation
import ActivityKit

struct TimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var endTime: Date
        var isPaused: Bool
        var remainingSeconds: Int
    }
    
    var startTime: Date
    var totalDuration: Int
}
