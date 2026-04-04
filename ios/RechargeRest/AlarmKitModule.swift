import Foundation
import SwiftUI
import AlarmKit

#if canImport(AlarmKit)
import AlarmKit
#endif

// Empty metadata type required by AlarmAttributes
#if canImport(AlarmKit)
@available(iOS 26.0, *)
nonisolated struct TimerAlarmMetadata: AlarmMetadata {}
#endif

@objc(AlarmKitModule)
class AlarmKitModule: NSObject {
    private var currentAlarmId: UUID?
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func requestAuthorization(_ resolver: @escaping RCTPromiseResolveBlock,
                              rejecter: @escaping RCTPromiseRejectBlock) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            Task {
                do {
                    let manager = AlarmManager.shared
                    let status = try await manager.requestAuthorization()
                    resolver([
                        "authorized": status == .authorized,
                        "status": String(describing: status)
                    ])
                } catch {
                    rejecter("AUTH_ERROR", "Failed to request AlarmKit authorization: \(error.localizedDescription)", error)
                }
            }
        } else {
            rejecter("UNSUPPORTED", "AlarmKit requires iOS 26.0 or later", nil)
        }
        #else
        rejecter("UNSUPPORTED", "AlarmKit not available", nil)
        #endif
    }
    
    @objc
    func getAuthorizationStatus(_ resolver: @escaping RCTPromiseResolveBlock,
                                rejecter: @escaping RCTPromiseRejectBlock) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            let manager = AlarmManager.shared
            let status = manager.authorizationState
            resolver([
                "authorized": status == .authorized,
                "status": String(describing: status)
            ])
        } else {
            resolver([
                "authorized": false,
                "status": "unsupported"
            ])
        }
        #else
        resolver([
            "authorized": false,
            "status": "unsupported"
        ])
        #endif
    }
    
    @objc
    func scheduleCountdownAlarm(_ durationSeconds: Int,
                                title: String,
                                soundEnabled: Bool,
                                resolver: @escaping RCTPromiseResolveBlock,
                                rejecter: @escaping RCTPromiseRejectBlock) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            Task {
                await scheduleAlarmInternal(durationSeconds: durationSeconds, title: title, soundEnabled: soundEnabled, resolver: resolver, rejecter: rejecter)
            }
        } else {
            rejecter("UNSUPPORTED", "AlarmKit requires iOS 26.0 or later", nil)
        }
        #else
        rejecter("UNSUPPORTED", "AlarmKit not available", nil)
        #endif
    }
    
    #if canImport(AlarmKit)
    @available(iOS 26.0, *)
    private func scheduleAlarmInternal(durationSeconds: Int, title: String, soundEnabled: Bool, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) async {
        let manager = AlarmManager.shared
        
        // Check authorization first
        if manager.authorizationState == .notDetermined {
            do {
                let _ = try await manager.requestAuthorization()
            } catch {
                rejecter("AUTH_ERROR", "Failed to request authorization: \(error.localizedDescription)", error)
                return
            }
        }
        
        guard manager.authorizationState == .authorized else {
            rejecter("NOT_AUTHORIZED", "AlarmKit not authorized", nil)
            return
        }
        
        do {
            // Create the alert presentation with LocalizedStringResource
            let alert = AlarmPresentation.Alert(
                title: LocalizedStringResource(stringLiteral: title),
                stopButton: AlarmButton(
                    text: LocalizedStringResource(stringLiteral: "Done"),
                    textColor: .green,
                    systemImageName: "checkmark"
                )
            )
            
            // Create alarm attributes with presentation
            let attributes = AlarmAttributes<TimerAlarmMetadata>(
                presentation: AlarmPresentation(alert: alert),
                tintColor: .green
            )

            // Schedule the countdown timer with sound configuration
            // Use .default for sound+vibration mode, silent audio file for vibrate-only mode
            let alarmId = UUID()
            let _ = try await manager.schedule(
                id: alarmId,
                configuration: .timer(
                    duration: TimeInterval(durationSeconds),
                    attributes: attributes,
                    sound: soundEnabled ? .default : .named("alarm-silent.mp3")
                )
            )
            
            self.currentAlarmId = alarmId
            
            resolver([
                "success": true,
                "alarmId": alarmId.uuidString
            ])
        } catch {
            rejecter("SCHEDULE_ERROR", "Failed to schedule alarm: \(error.localizedDescription)", error)
        }
    }
    #endif
    
    @objc
    func cancelAlarm(_ resolver: @escaping RCTPromiseResolveBlock,
                     rejecter: @escaping RCTPromiseRejectBlock) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            Task {
                do {
                    let manager = AlarmManager.shared
                    // Cancel all alarms from this app by ID
                    for alarm in try manager.alarms {
                        try await manager.cancel(id: alarm.id)
                    }
                    self.currentAlarmId = nil
                    
                    resolver(["success": true])
                } catch {
                    rejecter("CANCEL_ERROR", "Failed to cancel alarm: \(error.localizedDescription)", error)
                }
            }
        } else {
            resolver(["success": true])
        }
        #else
        resolver(["success": true])
        #endif
    }
    
    @objc
    func pauseAlarm(_ resolver: @escaping RCTPromiseResolveBlock,
                    rejecter: @escaping RCTPromiseRejectBlock) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            Task {
                do {
                    let manager = AlarmManager.shared
                    if let alarmId = self.currentAlarmId {
                        try await manager.pause(id: alarmId)
                        resolver(["success": true])
                    } else {
                        rejecter("NO_ALARM", "No active alarm to pause", nil)
                    }
                } catch {
                    rejecter("PAUSE_ERROR", "Failed to pause alarm: \(error.localizedDescription)", error)
                }
            }
        } else {
            rejecter("UNSUPPORTED", "AlarmKit requires iOS 26.0 or later", nil)
        }
        #else
        rejecter("UNSUPPORTED", "AlarmKit not available", nil)
        #endif
    }
    
    @objc
    func resumeAlarm(_ resolver: @escaping RCTPromiseResolveBlock,
                     rejecter: @escaping RCTPromiseRejectBlock) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            Task {
                do {
                    let manager = AlarmManager.shared
                    if let alarmId = self.currentAlarmId {
                        try await manager.resume(id: alarmId)
                        resolver(["success": true])
                    } else {
                        rejecter("NO_ALARM", "No active alarm to resume", nil)
                    }
                } catch {
                    rejecter("RESUME_ERROR", "Failed to resume alarm: \(error.localizedDescription)", error)
                }
            }
        } else {
            rejecter("UNSUPPORTED", "AlarmKit requires iOS 26.0 or later", nil)
        }
        #else
        rejecter("UNSUPPORTED", "AlarmKit not available", nil)
        #endif
    }
    
    @objc
    func isSupported(_ resolver: @escaping RCTPromiseResolveBlock,
                     rejecter: @escaping RCTPromiseRejectBlock) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            resolver([
                "supported": true
            ])
        } else {
            resolver([
                "supported": false
            ])
        }
        #else
        resolver([
            "supported": false
        ])
        #endif
    }
}
