# Database Schema Reference - SQLite

This document details the relational database schema managed by Sequelize ORM.

---

## Tables and Columns

### 1. `Users`
Tracks player accounts, rankings, balances, inventory purchases, and roles.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default UUIDV4 | Unique Identifier |
| `username` | String | Unique, Indexed, Not Null, Length [3, 20] | Display username |
| `email` | String | Unique, Indexed, Not Null, isEmail | Email credentials |
| `password_hash` | String | Not Null | Hashed password credentials |
| `avatar_url` | String | Default: `avatar_default_1` | Equipped avatar identifier |
| `coins` | Integer | Default: `500` | Account virtual coins balance |
| `elo` | Integer | Default: `1000` | Matchmaking rating rating |
| `role` | Enum | 'user', 'admin' | Access control level |
| `is_banned` | Boolean | Default: `false` | Block account access flag |
| `inventory` | Text | Default: `["avatar_default_1"]` | JSON string array of unlocked items |
| `created_at` | DateTime | Auto | Registration timestamp |
| `updated_at` | DateTime | Auto | Update timestamp |

### 2. `Friends`
Handles friendships and pending requests.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default UUIDV4 | Unique Identifier |
| `user_id` | UUID | Foreign Key (Users), Not Null | Initiator of request |
| `friend_id` | UUID | Foreign Key (Users), Not Null | Recipient of request |
| `status` | Enum | 'pending', 'accepted' | Request status |

### 3. `Matches`
Stores archives of completed gaming rounds.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default UUIDV4 | Match identifier |
| `game_type` | Enum | 'chess', 'carrom', 'ludo', 'ttt', Not Null | Active game engine |
| `status` | Enum | 'active', 'completed', 'cancelled' | Round status |
| `winner_id` | UUID | Foreign Key (Users), Nullable | Winner user id |
| `details` | Text | Default: `[]` | JSON string of players ELO changes |

### 4. `ChatMessages`
Saves message history for global lounge and private direct messages.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default UUIDV4 | Unique Identifier |
| `chat_type` | Enum | 'global', 'room', 'direct' | Conversation channel |
| `room_id` | UUID | Nullable | Custom lobby room link |
| `sender_id` | UUID | Foreign Key (Users), Not Null | Author profile |
| `recipient_id`| UUID | Foreign Key (Users), Nullable | Direct message recipient |
| `message_text`| Text | Not Null | Chat message body |

### 5. `Achievements`
Predefined milestone definitions.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | String | Primary Key | e.g. `first_win`, `streak_five` |
| `name` | String | Not Null | Display name |
| `description`| String | Not Null | Milestone text |
| `coin_reward`| Integer | Default: `100` | Coins gifted on unlocking |
| `icon_key` | String | Default: `award_default` | Icon symbol |

### 6. `UserAchievements`
Junction table linking players to unlocked achievements.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default UUIDV4 | Row identifier |
| `user_id` | UUID | Foreign Key (Users), Not Null | Player profile |
| `achievement_id`| String| Foreign Key (Achievements), Not Null | Earned achievement |

### 7. `Notifications`
Lobby notifications.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | Primary Key, Default UUIDV4 | Notification id |
| `user_id` | UUID | Foreign Key (Users), Not Null | Recipient profile |
| `type` | Enum | 'friend_request', 'room_invite', 'system' | Category |
| `message` | String | Not Null | Alert message |
| `is_read` | Boolean | Default: `false` | Read alert flag |
| `sender_id` | UUID | Foreign Key (Users), Nullable | Sender profile |
| `room_code` | String | Nullable | Game room invite code link |
