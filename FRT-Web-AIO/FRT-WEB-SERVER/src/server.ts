import express, { Request, Response, Application } from "express";
import { createServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import db from "./db";
import RequestType from "./types/RequestType";
import axios from 'axios';
import dotenv from 'dotenv';
import { Kafka } from 'kafkajs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import { randomUUID } from "crypto";

// Load environment variables from .env file
dotenv.config();
const app: Application = express();
const PORT = process.env.PORT || 3001;

const FASTAPI_SERVICE_URL = process.env.FASTAPI_SERVICE_URL;
const API_KEY = process.env.API_KEY;

// Create an HTTP server from the Express app
const server = createServer(app);
interface CustomWebSocket extends WebSocket {
  senderId?: string;
  teamId?: string;
}

// Helper to get the current file path for resolving SSL file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export enum Timeline {
  //start new chat
  START_NEW_CHAT = 550,
  
  // Mark-related actions
  DELETE_MARK = 1,
  UPDATE_MARK = 2,
  ADD_MARK = 3,

  // Map-related actions
  UPDATE_MAP = 4,

  // Mission-related actions
  CREATE_MISSION = 5,
  UPDATE_MISSION = 6,
  DELETE_MISSION = 7
}
type TextMessageType = 'text' | 'photo' | 'timeline' | 'callback_data';

export type ReplyMarkUp = {
  inline_keyboard: Array<Array<{
    text: string;
    callback_data: string;
  }>>;
}

type MessageStreamTopicDTO = {
  user_id: string;
  message_id: string;
  message_type: TextMessageType;
  chat_id: string;
  timestamp: string;
  message: string;
  message_origin:string;
  reply_markup?:ReplyMarkUp;

};

//sending the same message_id with different fields will cause update
type MapTopicDTO = {
  map_id: string;
  mark_type: string;
  user_id: string;
  message_id: string;
  timestamp: string;
  active: boolean; // false = delete mark
  location: {
    longitude: number;
    latitude: number;
  };
  description: string;
  size: number;
  title: string;
  publish_to_telegram: boolean;
};

enum MissionStatus {
  NA,
  OPEN,
  ACTIVE,
  COMPLETED,
  RESOLVED,
  CANCELLED,
  DELETED
};

type MissionTopicDTO = {
  mission_id: string;
  creator_id: string;
  assigned_id?: string;
  name: string;
  description: string;
  start_time?: number;
  end_time?: number;
  deadline?: number;
  mark_id?: string;
  mission_status: MissionStatus;
  history_assignee: string[];
  created_at?: number;
  updated_at?: number;
  team_id: string;
  publish_to_telegram: boolean;
}

type kafkaTopic = 'message_stream_topic' | 'map_topic' | 'mission_topic'

type kafkaMessage = MessageStreamTopicDTO | MapTopicDTO | MissionTopicDTO;

enum MessageChannelData {
  Text = 'text',
  Timeline = 'timeline',
  Photo = 'photo',
  Mission = 'mission'
}

export enum MarkType {
  USER = 1,
  ENEMY = 2,
  LANDMARK = 3,
  EVENT = 4,
};

export enum MessageType {
  Text = 'text',
  Typing = 'typing',
  Mark = 'mark',
  Timeline = 'timeline',
  Mission = 'mission',
  LoadMore = 'loadMore',
  Photo = 'photo'
}

export enum IconSize {
  small = 1,
  medium = 2,
  large = 3
}

export interface KafkaMissionMessage {
  user_id: string;
  team_id: string;
  timestamp: number;
  mission_id: string;
  message_type: MessageChannelData.Mission,
  action: Timeline.CREATE_MISSION | Timeline.UPDATE_MISSION | Timeline.DELETE_MISSION;
  mission_data?: {
    name: string;
    description: string;
    creator_id: string;
    assigned_id?: string;
    mission_status: number;
    deadline?: number;
    start_time?: number;
    end_time?: number;
  };
}

// Kafka configuration
const kafka = new Kafka({
  clientId: 'chat-app',
  brokers: ['kafka-25e5b167-sharonmor5869-ab1b.l.aivencloud.com:24803'],
  ssl: {
    rejectUnauthorized: false,
    ca: [fs.readFileSync(path.join(__dirname, '../config/ca.pem'), 'utf-8')],
    key: fs.readFileSync(path.join(__dirname, '../config/service.key'), 'utf-8'),
    cert: fs.readFileSync(path.join(__dirname, '../config/service.cert'), 'utf-8'),
  },
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID });

const runProducer = async () => {
  await producer.connect();
};

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: ['message_stream_topic', 'map_topic'] });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      console.log(`BEFORE BEFORE recieved kafka message with topic ${topic} and message:`);

      if (message.value) {
        const messageData = JSON.parse(message.value.toString());
        console.log('message data:',messageData); 
        switch (topic) {
          case 'message_stream_topic':
            broadcastTextMessage(messageData);
            break;
          case 'map_topic':
            broadcastMarkerMessage(messageData);
            break;
          default:
            console.log(`Unhandled topic: ${topic}`);
            break;
        }
      }
    },
  });
};

runProducer().catch(console.error);
runConsumer().catch(console.error);


function broadcastTextMessage(messageData: MessageStreamTopicDTO) {
  let messageType = messageData.message_type as string;
  if (messageData.message_type === 'callback_data') {
    messageType = 'actionResponse';
  }
  wss.clients.forEach((client: CustomWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.teamId === messageData.chat_id) {
      client.send(JSON.stringify({
        id: messageData.user_id + messageData.chat_id + messageData.timestamp,
        message: messageData.message,
        senderId: messageData.user_id,
        type: messageType,
        timestamp: messageData.timestamp,
        reply_markup: messageData.reply_markup
      }));
    }
  });
}

function broadcastMarkerMessage(markerData: MapTopicDTO) {
  wss.clients.forEach((client: CustomWebSocket) => {
    if (client.readyState === WebSocket.OPEN && client.teamId === markerData.map_id) {
      client.send(JSON.stringify({...markerData,type:'mark'}));
    }
  });
}

const sendMessageToKafka = async (topic: kafkaTopic, message: kafkaMessage) => {

  try {
    await producer.send({
      topic,
      messages: [
        { value: JSON.stringify(message) },
      ],
    });
  } catch (error) {
    console.error('Error sending message to Kafka', error);
  }
};


const wss = new WebSocketServer({ noServer: true });

app.use(express.json());


async function fetchChatData(teamId, page = 0, pageSize = 30) {
  try {
    const response = await axios.post(`${FASTAPI_SERVICE_URL}/api/v1/messenger/getChat`, {
      chat_id: teamId,
      page: page,
      page_size: pageSize
    }, {
      headers: {
        'Content-Type': 'application/json',
        'API-Key': API_KEY
      }
    });
    console.log('response:data', response.data);

    return response.data;
  } catch (error) {
    console.error("Failed to fetch chat data:", error);
    return null;
  }
}

app.get("/api/v1/users/:uid", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const user = await db.get(
      "users",
      uid,
      RequestType.COLLECTION_COMA_ID_VALUE
    );
    if (user) {
      res.json(user);
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).send("Server error");
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get("/api/v1/users/getUserByEmail/:userEmail", async (req: Request, res: Response) => {
  try {
    const { userEmail } = req.params;
    const user = await db.get(
      "users",
      `email,${userEmail}`,
      RequestType.DATA_BY_FIELD
    );
    if (user) {
      res.json(user);
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).send("Server error");
  }
});

app.get("/api/v1/telegramUsers/:uid", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const user = await db.get(
      "telegram_users",
      uid,
      RequestType.COLLECTION_COMA_ID_VALUE
    );
    if (user) {
      res.json(user);
    } else {
      res.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).send("Server error");
  }
});

app.post('/api/v1/users/getUsersByIds', async (req, res) => {

  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
    const response = await db.post(
      `users`,
      { documents_id: userIds },
      RequestType.BULK_COLLECTION_DOCS_BY_ID
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post("/api/v1/users/:uid", async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid;
    const { email, displayName } = req.body;

    if (!displayName) {
      return res.status(400).send("Display name is required");
    }

    const result = await db.post(
      `users,${uid}`,
      { email, displayName },
      RequestType.COLLECTION_COMA_ID_VALUE
    );
    res.json(result);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Server error");
  }
});

app.post("/api/v1/telegramUsers/:telegram_user_uid", async (req: Request, res: Response) => {
  try {
    const telegram_user_uid = req.params.telegram_user_uid;
    const { localUserId } = req.body;

    const result = await db.post(
      `telegram_users,${telegram_user_uid}`,
      { user_id: localUserId },
      RequestType.COLLECTION_COMA_ID_VALUE
    );
    res.json(result);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Server error");
  }
});

app.put("/api/v1/users/:uid", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const updatedUserData = req.body;

    if (!updatedUserData || typeof updatedUserData !== 'object') {
      return res.status(400).send("Invalid user data");
    }

    const result = await db.update(1, `users,${uid}`, updatedUserData);

    console.log('Update result:', result);
    res.json(result);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Server error");
  }
});

app.use(express.static("public"));

server.on("upgrade", (request, socket, head) => {
  const reqUrl = new URL(request.url, `http://${request.headers.host}`);
  const teamId = reqUrl.searchParams.get("teamId");

  if (teamId) {
    wss.handleUpgrade(request, socket, head, (ws: CustomWebSocket) => {
      ws.teamId = teamId; // Store teamId with the WebSocket object
      wss.emit("connection", ws, request);
    });
  } else {
    socket.write(
      "HTTP/1.1 400 Bad Request\r\n" +
      "Content-Type: text/plain\r\n" +
      "Connection: close\r\n" +
      "\r\n" +
      "Missing teamId parameter\r\n"
    );
    socket.destroy();
  }
});



wss.on("connection", async (ws: CustomWebSocket) => {
  console.log("WebSocket connection established for teamId:", ws.teamId);


  ws.on('message', async (data: WebSocket.Data) => {
    try {
      const message = JSON.parse(data.toString());
      // Store senderId when first received
      if (message.senderId && !ws.senderId) {
        ws.senderId = message.senderId;
      }
      switch (message.type) {
        case MessageType.Text:
        case MessageType.Photo:
          await handleChatMessage(message);
          break;

        case MessageType.Typing:
          handleTypingStatus(message, ws);
          break;

        case MessageType.LoadMore:
          await handleLoadMoreMessages(message, ws);
          break;

        case MessageType.Mark:
          await handleMarkMessage(message);
          break;
        //shouldnt happen for now as mission requests go through http and not kafka.
        case MessageType.Mission:
          await handleMissionMessage(message, ws);
          break;

        default:
          console.warn(`Unknown message type received: ${message.type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
    }
  });

  async function handleChatMessage(message: any) {
    //add callback_data type of message here
    const { senderId, id: teamId, message: messageContent, type, timestamp } = message;
    console.log('handling chat message:');
    console.log(message);
    
    
    const kafkaMsg: MessageStreamTopicDTO = {
      user_id: senderId,
      message_id: randomUUID(),
      message_type: type,
      chat_id: teamId,
      timestamp,
      message: messageContent,
      message_origin: 'web'
    };

    await sendMessageToKafka('message_stream_topic', kafkaMsg);
  }

  function handleTypingStatus(message: any, ws: WebSocket & { teamId?: string }) {
    broadcastTypingStatus(ws, message.typing);
  }

  function broadcastTypingStatus(ws: WebSocket & { teamId?: string; senderId?: string }, isTyping: boolean) {
    wss.clients.forEach((client: CustomWebSocket) => {
      if (client !== ws && client.readyState === WebSocket.OPEN && client.teamId === ws.teamId) {
        client.send(JSON.stringify({ type: 'typing', senderId: ws.senderId, typing: isTyping }));
      }
    });
  }

  async function handleLoadMoreMessages(message: any, ws: WebSocket & { teamId?: string }) {
    const additionalMessages = await fetchChatData(ws.teamId, message.page, message.pageSize);
    if (additionalMessages) {
      ws.send(JSON.stringify({
        type: 'additionalMessages',
        messages: additionalMessages
      }));
    }
  }

  async function handleMarkMessage(message: any) {
    console.log('recieved mark message:');
    console.log(message);
    
    
    const kafkaMsg: MapTopicDTO = {
      user_id: message.user_id,
      map_id: message.map_id,
      timestamp: message.timestamp,
      description: message.description,
      active: message.active || false,
      location: message.location,
      mark_type: message.mark_type,
      size: message.size,
      title: message.title,
      message_id: message.message_id,
      publish_to_telegram: message.publishToTelegram
    };
    console.log('publishing mark message:');
    console.log(kafkaMsg);
    
    await sendMessageToKafka('map_topic', kafkaMsg);
  }

  async function handleMissionMessage(message: any, ws: WebSocket & { teamId?: string }) {
    const { user_id, team_id, mission_id, action, mission_data } = message;
    console.log('the message is:', message);

    const timestamp = DateTime.now().setZone('Asia/Jerusalem').toJSDate();

    console.log('got a mission!', mission_data);

      //not sure if needed as all mission requests are going through http.
      //need to make sure this file is a kafka consumer of mission_topic to update ws
      const missionMsg: MissionTopicDTO = {
        mission_id:mission_data._id,
        creator_id:mission_data.user_id,
        assigned_id:mission_data.assigned_id,
        name:mission_data.name,
        description:mission_data.description,
        start_time:mission_data.start_time,
        end_time:mission_data.end_time,
        deadline:mission_data.deadline,
        mark_id:mission_data.mark_id,
        history_assignee:mission_data.history_assignee,
        mission_status:mission_data.mission_status,
        created_at:mission_data.created_at,
        updated_at:mission_data.update_at,
        team_id:mission_data.team_id,
        publish_to_telegram:mission_data.publishToTelegram
      };

      await sendMessageToKafka('mission_topic', missionMsg);
    
  }

  ws.on('close', () => {
    console.log('Connection closed for teamId:', ws.teamId);
    // Broadcast typing has stopped to all clients in the same team if senderId was stored
    if (ws.senderId) {
      const stopTypingMessage = JSON.stringify({ type: 'typing', senderId: ws.senderId, typing: false });
      wss.clients.forEach((client: CustomWebSocket) => {
        if (client.readyState === WebSocket.OPEN && client.teamId === ws.teamId) {
          client.send(stopTypingMessage);
        }
      });
    }
  });
  

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});

process.on("SIGINT", () => {
  server.close(() => {
    console.log("Server stopped");
    process.exit(0);
  });
});

