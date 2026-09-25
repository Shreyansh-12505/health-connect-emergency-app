import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
const dataFile = path.join(dataDir, 'db.json');

const hospitalSeed = [
  { id: 'hosp-sassoon', name: 'B. J. Government Medical College & Sassoon General Hospitals', distance: '2.1 km', beds: 14, icu: 5, trauma: true, region: 'Pune', location: { lat: 18.5196, lng: 73.876 } },
  { id: 'hosp-kem', name: 'King Edward Memorial Hospital', distance: '119 km', beds: 9, icu: 3, trauma: true, region: 'Parel, Mumbai', location: { lat: 19.001, lng: 72.842 } },
  { id: 'hosp-jj', name: 'Sir J. J. Group of Hospitals', distance: '118 km', beds: 18, icu: 6, trauma: true, region: 'Byculla, Mumbai', location: { lat: 18.963, lng: 72.833 } },
  { id: 'hosp-gmch-nagpur', name: 'Government Medical College & Hospital, Nagpur', distance: '621 km', beds: 22, icu: 8, trauma: true, region: 'Nagpur', location: { lat: 21.15, lng: 79.09 } },
  { id: 'hosp-gmch-sambhajinagar', name: 'Government Medical College & Hospital, Chhatrapati Sambhajinagar', distance: '216 km', beds: 11, icu: 4, trauma: false, region: 'Chhatrapati Sambhajinagar', location: { lat: 19.876, lng: 75.343 } }
];

const driverLocation = { lat: 18.528, lng: 73.865 };
const patientLocation = { lat: 18.52, lng: 73.856 };
const fareConfig = {
  baseFare: Number(process.env.BASE_FARE || 250),
  perKmRate: Number(process.env.PER_KM_RATE || 35),
  driverShare: Number(process.env.DRIVER_SHARE || 0.8),
  priorityBonus: {
    Critical: Number(process.env.CRITICAL_PRIORITY_BONUS || 180),
    Moderate: Number(process.env.MODERATE_PRIORITY_BONUS || 100),
    Normal: Number(process.env.NORMAL_PRIORITY_BONUS || 50)
  }
};

const rewardPointsByPriority = {
  Critical: 70,
  Moderate: 50,
  Normal: 35
};

const demoRequests = [
  {
    id: 'demo-req-noida-critical',
    patientId: 'walk-in-mumbai',
    patientName: 'Neha Sharma',
    contact: '+91 98111 22334',
    driverId: null,
    status: 'Pending',
    emergencyType: 'Accident',
    priority: 'Critical',
    distance: '6.2 km',
    eta: 5,
    region: 'Dadar, Mumbai',
    patientLocation: { lat: 19.017, lng: 72.847 },
    driverLocation: { lat: 19.025, lng: 72.84 },
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString()
  },
  {
    id: 'demo-req-gurugram-moderate',
    patientId: 'walk-in-pune',
    patientName: 'Kabir Malhotra',
    contact: '+91 98990 77881',
    driverId: 'driver-profile-demo',
    status: 'Accepted',
    emergencyType: 'Cardiac',
    priority: 'Moderate',
    distance: '9.8 km',
    eta: 8,
    region: 'Shivajinagar, Pune',
    patientLocation: { lat: 18.53, lng: 73.847 },
    driverLocation: { lat: 18.536, lng: 73.878 },
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString()
  }
];

const userSchema = new mongoose.Schema(
  { _id: String, name: String, email: String, password: String, role: String, phone: String },
  { timestamps: true }
);
const driverSchema = new mongoose.Schema(
  {
    _id: String,
    userId: String,
    name: String,
    licenseNumber: String,
    vehicleNumber: String,
    phone: String,
    status: String,
    location: Object,
    completed: Number,
    completedRides: Number,
    totalEarnings: Number,
    walletBalance: Number,
    servicePoints: Number
  },
  { timestamps: true }
);
const requestSchema = new mongoose.Schema(
  {
    _id: String,
    patientId: String,
    patientName: String,
    contact: String,
    driverId: String,
    driverName: String,
    driverPhone: String,
    vehicleNumber: String,
    status: String,
    emergencyType: String,
    priority: String,
    distance: String,
    eta: Number,
    patientLocation: Object,
    driverLocation: Object,
    fare: Number,
    driverEarning: Number,
    paymentStatus: String,
    paymentId: String,
    completedAt: String,
    rewardPointsEarned: Number,
    rejectedDrivers: Array,
    rejectionHistory: Array,
    createdAt: String
  },
  { timestamps: true }
);
const paymentSchema = new mongoose.Schema(
  {
    _id: String,
    rideId: String,
    driverId: String,
    amount: Number,
    fare: Number,
    servicePoints: Number,
    status: String,
    type: String,
    createdAt: String
  },
  { timestamps: true }
);

let UserModel;
let DriverModel;
let RequestModel;
let PaymentModel;
let mode = 'json';
let db = null;

function parseDistanceKm(distance) {
  const value = Number.parseFloat(String(distance || '').replace(' km', ''));
  return Number.isFinite(value) ? value : 0;
}

function getDriverLevel(points = 0) {
  if (points >= 1200) return 'Emergency Champion';
  if (points >= 650) return 'Gold Responder';
  if (points >= 250) return 'Silver Responder';
  return 'Bronze Responder';
}

function calculateRidePayment(request) {
  const distanceKm = parseDistanceKm(request.distance);
  const priorityBonus = fareConfig.priorityBonus[request.priority] || 0;
  const fare = Math.round(fareConfig.baseFare + distanceKm * fareConfig.perKmRate + priorityBonus);
  const driverEarning = Math.round(fare * fareConfig.driverShare);
  const servicePoints = rewardPointsByPriority[request.priority] || 35;
  return { fare, driverEarning, servicePoints };
}

function enrichDriver(driver) {
  if (!driver) return null;
  const completedRides = driver.completedRides ?? driver.completed ?? 0;
  const servicePoints = driver.servicePoints || completedRides * 35;
  const totalEarnings = driver.totalEarnings || 0;
  return {
    ...driver,
    completed: completedRides,
    completedRides,
    totalEarnings,
    walletBalance: driver.walletBalance ?? totalEarnings,
    servicePoints,
    level: driver.level || getDriverLevel(servicePoints)
  };
}

function enrichRequest(request) {
  if (!request) return null;
  return {
    ...request,
    paymentStatus: request.paymentStatus || 'Unpaid',
    rejectedDrivers: request.rejectedDrivers || [],
    rejectionHistory: request.rejectionHistory || []
  };
}

function requestError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function seedJson() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    db = JSON.parse(await fs.readFile(dataFile, 'utf8'));
    db.hospitals = hospitalSeed;
    db.requests = db.requests || [];
    db.drivers = db.drivers || [];
    db.transactions = db.transactions || [];
    db.drivers = db.drivers.map((driver) => {
      const completed = driver.id === 'driver-profile-demo' ? Math.max(driver.completed || 0, 16) : driver.completed || 0;
      return enrichDriver({ ...driver, location: driver.id === 'driver-profile-demo' ? driverLocation : driver.location || driverLocation, vehicleNumber: driver.id === 'driver-profile-demo' ? 'MH 12 AM 2047' : driver.vehicleNumber, completed, completedRides: driver.completedRides ?? completed });
    });
    db.requests = db.requests.map(enrichRequest);
    db.requests = db.requests.map((request) => {
      const demo = demoRequests.find((item) => item.id === request.id);
      return demo ? { ...request, patientId: demo.patientId, region: demo.region, patientLocation: demo.patientLocation, driverLocation: demo.driverLocation } : request;
    });
    for (const request of demoRequests) {
      if (!db.requests.some((item) => item.id === request.id)) db.requests.push(request);
    }
    await saveJson();
  } catch {
    const patientPassword = await bcrypt.hash('123456', 10);
    const driverPassword = await bcrypt.hash('123456', 10);
    db = {
      users: [
        { id: 'patient-demo', name: 'Aarav Mehta', email: 'patient@test.com', password: patientPassword, role: 'patient', phone: '+91 98765 43210' },
        { id: 'driver-demo', name: 'Rohan Singh', email: 'driver@test.com', password: driverPassword, role: 'driver', phone: '+91 99887 76655' }
      ],
      drivers: [
        {
          id: 'driver-profile-demo',
          userId: 'driver-demo',
          name: 'Rohan Singh',
          licenseNumber: 'MH-042026-AMB',
          vehicleNumber: 'MH 12 AM 2047',
          phone: '+91 99887 76655',
          status: 'ONLINE',
          location: driverLocation,
          completed: 8,
          completedRides: 8,
          totalEarnings: 0,
          walletBalance: 0,
          servicePoints: 280
        }
      ],
      requests: demoRequests,
      transactions: [],
      hospitals: hospitalSeed
    };
    await saveJson();
  }
}

async function saveJson() {
  if (mode === 'json') {
    try {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(dataFile, JSON.stringify(db, null, 2));
    } catch (error) {
      console.warn(`JSON store is running in memory because disk write failed: ${error.message}`);
    }
  }
}

export async function initStore() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      UserModel = mongoose.model('User', userSchema);
      DriverModel = mongoose.model('Driver', driverSchema);
      RequestModel = mongoose.model('AmbulanceRequest', requestSchema);
      PaymentModel = mongoose.model('DriverPayment', paymentSchema);
      mode = 'mongo';
      await seedMongo();
      return { mode };
    } catch (error) {
      console.warn('MongoDB unavailable, falling back to JSON store:', error.message);
    }
  }
  mode = 'json';
  await seedJson();
  return { mode };
}

async function seedMongo() {
  const users = await UserModel.countDocuments();
  if (users > 0) return;
  const patientPassword = await bcrypt.hash('123456', 10);
  const driverPassword = await bcrypt.hash('123456', 10);
  await UserModel.create([
    { _id: 'patient-demo', name: 'Aarav Mehta', email: 'patient@test.com', password: patientPassword, role: 'patient', phone: '+91 98765 43210' },
    { _id: 'driver-demo', name: 'Rohan Singh', email: 'driver@test.com', password: driverPassword, role: 'driver', phone: '+91 99887 76655' }
  ]);
  await DriverModel.create({
    _id: 'driver-profile-demo',
    userId: 'driver-demo',
    name: 'Rohan Singh',
    licenseNumber: 'DL-042026-AMB',
    vehicleNumber: 'DL 01 AM 2047',
    phone: '+91 99887 76655',
    status: 'ONLINE',
    location: driverLocation,
    completed: 8,
    completedRides: 8,
    totalEarnings: 0,
    walletBalance: 0,
    servicePoints: 280
  });
}

const normalize = (doc) => {
  const raw = doc?.toObject ? doc.toObject() : doc;
  if (!raw) return null;
  return { ...raw, id: raw.id || raw._id?.toString() };
};

export async function findUserByEmail(email) {
  if (mode === 'mongo') return normalize(await UserModel.findOne({ email }));
  return db.users.find((user) => user.email === email) || null;
}

export async function createUser(payload) {
  const user = { id: nanoid(), ...payload, password: await bcrypt.hash(payload.password, 10) };
  if (mode === 'mongo') {
    const created = normalize(await UserModel.create({ _id: user.id, ...user }));
    if (user.role === 'driver') {
      await DriverModel.create({
        _id: nanoid(),
        userId: user.id,
        name: user.name,
        licenseNumber: payload.licenseNumber || 'DL-DEMO-0001',
        vehicleNumber: payload.vehicleNumber || 'AMB-DEMO',
        phone: payload.phone,
        status: 'OFFLINE',
        location: driverLocation,
        completed: 0,
        completedRides: 0,
        totalEarnings: 0,
        walletBalance: 0,
        servicePoints: 0
      });
    }
    return created;
  }
  db.users.push(user);
  if (user.role === 'driver') {
    db.drivers.push({
      id: nanoid(),
      userId: user.id,
      name: user.name,
      licenseNumber: payload.licenseNumber || 'DL-DEMO-0001',
      vehicleNumber: payload.vehicleNumber || 'AMB-DEMO',
      phone: payload.phone,
      status: 'OFFLINE',
      location: driverLocation,
      completed: 0,
      completedRides: 0,
      totalEarnings: 0,
      walletBalance: 0,
      servicePoints: 0
    });
  }
  await saveJson();
  return user;
}

export async function getDriverByUser(userId) {
  if (mode === 'mongo') return enrichDriver(normalize(await DriverModel.findOne({ userId })));
  return enrichDriver(db.drivers.find((driver) => driver.userId === userId) || null);
}

export async function setDriverStatus(userId, status) {
  if (mode === 'mongo') {
    return enrichDriver(normalize(await DriverModel.findOneAndUpdate({ userId }, { status }, { new: true })));
  }
  const driver = db.drivers.find((item) => item.userId === userId);
  if (driver) driver.status = status;
  await saveJson();
  return enrichDriver(driver);
}

export async function listOnlineDrivers() {
  if (mode === 'mongo') return (await DriverModel.find({ status: 'ONLINE' })).map(normalize).map(enrichDriver);
  return db.drivers.filter((driver) => driver.status === 'ONLINE').map(enrichDriver);
}

export async function createRequest(payload) {
  const priorityEta = { Critical: 4, Moderate: 7, Normal: 11 };
  const request = {
    id: nanoid(),
    patientId: payload.patientId,
    patientName: payload.patientName,
    contact: payload.contact,
    driverId: null,
    status: 'Pending',
    emergencyType: payload.emergencyType,
    priority: payload.priority,
    distance: payload.priority === 'Critical' ? '2.1 km' : '4.6 km',
    eta: priorityEta[payload.priority] || 8,
    region: 'Pune, Maharashtra (demo dispatch area)',
    patientLocation,
    driverLocation,
    fare: null,
    driverEarning: null,
    paymentStatus: 'Unpaid',
    paymentId: null,
    completedAt: null,
    rewardPointsEarned: 0,
    rejectedDrivers: [],
    rejectionHistory: [],
    createdAt: new Date().toISOString()
  };
  if (mode === 'mongo') return normalize(await RequestModel.create({ _id: request.id, ...request }));
  db.requests.unshift(request);
  await saveJson();
  return request;
}

export async function listRequestsForUser(user) {
  const sort = (items) => items.sort((a, b) => {
    const weight = { Critical: 3, Moderate: 2, Normal: 1 };
    return (weight[b.priority] || 0) - (weight[a.priority] || 0) || new Date(b.createdAt) - new Date(a.createdAt);
  });
  if (mode === 'mongo') {
    const driver = user.role === 'driver' ? await getDriverByUser(user.id) : null;
    const query = user.role === 'patient' ? { patientId: user.id } : {};
    const requests = (await RequestModel.find(query)).map(normalize).map(enrichRequest);
    return sort(driver ? requests.filter((req) => !req.rejectedDrivers.includes(driver.id)) : requests);
  }
  const driver = user.role === 'driver' ? await getDriverByUser(user.id) : null;
  const items = user.role === 'patient' ? db.requests.filter((req) => req.patientId === user.id) : db.requests;
  const visible = driver ? items.filter((req) => !(req.rejectedDrivers || []).includes(driver.id)) : items;
  return sort(visible.map(enrichRequest));
}

export async function updateRequestStatus(id, status, driverUserId, options = {}) {
  if (!driverUserId) throw requestError('Drivers only', 403);
  const driver = await getDriverByUser(driverUserId);
  if (!driver) throw requestError('Driver profile not found', 404);

  if (mode === 'mongo') {
    const request = normalize(await RequestModel.findOne({ _id: id }));
    if (!request) throw requestError('Ride not found', 404);
    const result = await applyStatusChange(enrichRequest(request), driver, status, options, async ({ requestPatch, driverPatch, transaction }) => {
      const updatedRequest = normalize(await RequestModel.findOneAndUpdate({ _id: id }, requestPatch, { new: true }));
      let updatedDriver = driver;
      if (driverPatch) {
        updatedDriver = enrichDriver(normalize(await DriverModel.findOneAndUpdate({ _id: driver.id }, driverPatch, { new: true })));
      }
      let savedTransaction = null;
      if (transaction) savedTransaction = normalize(await PaymentModel.create({ _id: transaction.id, ...transaction }));
      return { request: enrichRequest(updatedRequest), driver: updatedDriver, transaction: savedTransaction };
    });
    return result;
  }

  const request = db.requests.find((item) => item.id === id);
  if (!request) throw requestError('Ride not found', 404);
  const result = await applyStatusChange(enrichRequest(request), driver, status, options, async ({ requestPatch, driverPatch, transaction }) => {
    Object.assign(request, requestPatch);
    const storedDriver = db.drivers.find((item) => item.id === driver.id);
    if (storedDriver && driverPatch) Object.assign(storedDriver, driverPatch);
    if (transaction) db.transactions.unshift(transaction);
    return { request: enrichRequest(request), driver: enrichDriver(storedDriver || driver), transaction };
  });
  await saveJson();
  return result;
}

async function applyStatusChange(request, driver, status, options, persist) {
  if (!['Accepted', 'Rejected', 'Completed'].includes(status)) {
    throw requestError('Invalid ride status');
  }

  if (status === 'Rejected') {
    if (request.status !== 'Pending') throw requestError('Only pending rides can be rejected');
    if (request.rejectedDrivers.includes(driver.id)) {
      return { request, driver, transaction: null };
    }
    const rejection = {
      driverId: driver.id,
      reason: options.reason || 'Other',
      createdAt: new Date().toISOString()
    };
    return persist({
      requestPatch: {
        rejectedDrivers: [...request.rejectedDrivers, driver.id],
        rejectionHistory: [...request.rejectionHistory, rejection],
        status: 'Pending'
      }
    });
  }

  if (status === 'Accepted') {
    if (request.status !== 'Pending') throw requestError('Ride is no longer available');
    if (request.rejectedDrivers.includes(driver.id)) throw requestError('This driver already rejected the ride');
    return persist({
      requestPatch: {
        status: 'Accepted',
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone,
        vehicleNumber: driver.vehicleNumber,
        paymentStatus: request.paymentStatus || 'Unpaid'
      }
    });
  }

  if (request.status === 'Completed' && request.driverId === driver.id) {
    return { request, driver, transaction: null };
  }
  if (request.status !== 'Accepted') throw requestError('Only accepted rides can be completed');
  if (request.driverId !== driver.id) throw requestError('Only the assigned driver can complete this ride', 403);
  if (request.paymentId) {
    return persist({ requestPatch: { status: 'Completed' } });
  }

  const payment = calculateRidePayment(request);
  const transaction = {
    id: nanoid(),
    rideId: request.id,
    driverId: driver.id,
    amount: payment.driverEarning,
    fare: payment.fare,
    servicePoints: payment.servicePoints,
    status: 'Paid',
    type: 'Ride earning',
    createdAt: new Date().toISOString()
  };
  const completedRides = (driver.completedRides ?? driver.completed ?? 0) + 1;
  const totalEarnings = (driver.totalEarnings || 0) + payment.driverEarning;
  const walletBalance = (driver.walletBalance ?? driver.totalEarnings ?? 0) + payment.driverEarning;
  const servicePoints = (driver.servicePoints || 0) + payment.servicePoints;

  return persist({
    requestPatch: {
      status: 'Completed',
      fare: payment.fare,
      driverEarning: payment.driverEarning,
      paymentStatus: 'Paid',
      paymentId: transaction.id,
      completedAt: transaction.createdAt,
      rewardPointsEarned: payment.servicePoints
    },
    driverPatch: {
      completed: completedRides,
      completedRides,
      totalEarnings,
      walletBalance,
      servicePoints
    },
    transaction
  });
}

export async function getDriverEarnings(userId) {
  const driver = await getDriverByUser(userId);
  if (!driver) throw requestError('Driver profile not found', 404);
  const transactions =
    mode === 'mongo'
      ? (await PaymentModel.find({ driverId: driver.id }).sort({ createdAt: -1 }).limit(5)).map(normalize)
      : db.transactions.filter((item) => item.driverId === driver.id).slice(0, 5);

  return {
    driver: enrichDriver(driver),
    transactions
  };
}

export async function getHospitals() {
  return mode === 'mongo' ? hospitalSeed : db.hospitals;
}
