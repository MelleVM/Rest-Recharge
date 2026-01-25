import Foundation
import ActivityKit
import UIKit

@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
    private var currentActivity: Activity<TimerAttributes>?
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func startTimer(_ duration: Int,
                    resolver: @escaping RCTPromiseResolveBlock,
                    rejecter: @escaping RCTPromiseRejectBlock) {
        
        // Check if Live Activities are supported
        if #available(iOS 16.1, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                rejecter("UNAVAILABLE", "Live Activities are not enabled", nil)
                return
            }
            
            let startTime = Date()
            let endTime = startTime.addingTimeInterval(TimeInterval(duration))
            
            let attributes = TimerAttributes(
                startTime: startTime,
                totalDuration: duration
            )
            
            let contentState = TimerAttributes.ContentState(
                endTime: endTime,
                isPaused: false,
                remainingSeconds: duration
            )
            
            do {
                let activity = try Activity<TimerAttributes>.request(
                    attributes: attributes,
                    contentState: contentState,
                    pushType: nil
                )
                
                self.currentActivity = activity
                
                resolver([
                    "activityId": activity.id,
                    "success": true
                ])
            } catch {
                rejecter("ERROR", "Failed to start Live Activity: \(error.localizedDescription)", error)
            }
        } else {
            rejecter("UNSUPPORTED", "Live Activities require iOS 16.1 or later", nil)
        }
    }
    
    @objc
    func updateTimer(_ remainingSeconds: Int,
                     isPaused: Bool,
                     resolver: @escaping RCTPromiseResolveBlock,
                     rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 16.1, *) {
            guard let activity = self.currentActivity else {
                rejecter("NO_ACTIVITY", "No active Live Activity found", nil)
                return
            }
            
            // End the activity when timer reaches 0
            if remainingSeconds <= 0 {
                Task {
                    await activity.end(dismissalPolicy: .immediate)
                    self.currentActivity = nil
                    resolver(["success": true, "ended": true])
                }
                return
            }
            
            let endTime = Date().addingTimeInterval(TimeInterval(remainingSeconds))
            
            let contentState = TimerAttributes.ContentState(
                endTime: endTime,
                isPaused: isPaused,
                remainingSeconds: remainingSeconds
            )
            
            Task {
                await activity.update(using: contentState)
                resolver(["success": true])
            }
        } else {
            rejecter("UNSUPPORTED", "Live Activities require iOS 16.1 or later", nil)
        }
    }
    
    @objc
    func stopTimer(_ resolver: @escaping RCTPromiseResolveBlock,
                   rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 16.1, *) {
            guard let activity = self.currentActivity else {
                resolver(["success": true, "message": "No active activity to stop"])
                return
            }
            
            Task {
                await activity.end(dismissalPolicy: .immediate)
                self.currentActivity = nil
                resolver(["success": true])
            }
        } else {
            rejecter("UNSUPPORTED", "Live Activities require iOS 16.1 or later", nil)
        }
    }
    
    @objc
    func isSupported(_ resolver: @escaping RCTPromiseResolveBlock,
                     rejecter: @escaping RCTPromiseRejectBlock) {
        
        if #available(iOS 16.1, *) {
            let isEnabled = ActivityAuthorizationInfo().areActivitiesEnabled
            resolver([
                "supported": true,
                "enabled": isEnabled
            ])
        } else {
            resolver([
                "supported": false,
                "enabled": false
            ])
        }
    }
}
