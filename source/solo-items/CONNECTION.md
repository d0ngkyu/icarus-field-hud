# Connection status · 0.3.3

ONLINE means a fresh response from this tool's Lua mod, not a delivery receipt or proof that every tuning option is active. The app requires the selected installation's actual client process, enabled/owned mod, well-formed heartbeat, age <=10 seconds and a mod session timestamp no earlier than the process start tolerance.

WAITING means the client is running but there is no current mod heartbeat. OFFLINE covers a stopped client, disabled/missing mod or inability to validate the installation/process. A short explanation accompanies the badge. Color is supplemented with text.

Lua writes a tiny local heartbeat every 3 seconds using LoopAsync, with no UObject calls, new native hooks, game memory scan or world enumeration. Compatibility uses the existing UE4SS LoopAsync API; current upstream documents it as deprecated in favor of newer delayed APIs, which are not assumed to exist in the user's installed build. Reference: https://docs.ue4ss.com/lua-api/global-functions/loopasync.html

Only an explicit F11 press checks controller/player/standalone status through the existing game-thread mechanism. Without an item request it only checks readiness; with a pending request it also processes that request. The readiness description expires in 10 seconds, so a previous world check is not retained indefinitely. It is a recent observation, not continuous world-mode tracking. Health/stamina/etc still require applying while the game is stopped and restarting.

Validation: C# freshness/session/malformed/missing/multi/single/expiry cases; 32 resize/tab combinations; 8 Lua mock tests including zero native calls from heartbeat and zero item calls from a check without a request. Actual OFFLINE screen inspected. Live in-game heartbeat and F11 readiness remain unverified until the next game session. No game was launched or stopped for verification.
