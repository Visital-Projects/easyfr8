# EasyFr8 Console REST API Documentation

This document describes all backend REST APIs designed for integration with the EasyFr8 Digital Freight Forwarding Admin Console.

---

## Base URL
* Local Development: `http://localhost:3000/api`
* Live Staging: `https://admineasy.vnvision.in/api`

---

## Authentication Mechanism
All API routes verify the administrative session.
* Authentication Header: `Authorization: Bearer <session_state_token>`
* Web Session: Session state is kept inside local storage key `easyfr8_session = true` and `easyfr8_currentUser`.

---

## Endpoint Lists

### 1. Authentication
#### `POST /api/auth/login`
Checks administrator credentials and initializes session attributes.

* **Request Body (JSON)**:
  ```json
  {
    "email": "biswa@easyfr8.com",
    "password": "admin123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "USR-081",
      "name": "Biswajit Shaw",
      "email": "biswa@easyfr8.com",
      "role": "Administrator",
      "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150"
    }
  }
  ```
* **Failure Response (401 Unauthorized)**:
  ```json
  {
    "success": false,
    "error": "Invalid email address or passwords credentials match."
  }
  ```

---

### 2. Website CMS Settings
#### `GET /api/cms`
Retrieves website layout configuration (banners, FAQs, operational settings).

* **Success Response (200 OK)**:
  ```json
  {
    "homepage": {
      "heroTitle": "Connecting Global Markets Seamlessly",
      "heroSubtitle": "Your trusted freight forwarding partner...",
      "testimonials": [...]
    }
  }
  ```

#### `PUT /api/cms`
Updates website layout settings. Requires admin permissions.

* **Request Body (JSON)**:
  ```json
  {
    "homepage": {
      "heroTitle": "Updated Title Text",
      "heroSubtitle": "Updated subtitle text..."
    }
  }
  ```
* **Response (200 OK)**:
  ```json
  { "success": true }
  ```

---

### 3. Blog Publications
#### `GET /api/blogs`
Returns list of all case studies, blank sailing notices, and custom advisories.

* **Success Response (200 OK)**:
  ```json
  [
    {
      "id": "BLG-401",
      "title": "Navigating Blank Sailings in Q3 2026",
      "category": "Industry Updates",
      "status": "Published",
      "date": "2026-07-02"
    }
  ]
  ```

#### `POST /api/blogs`
Creates a new blog article.

* **Request Body (JSON)**:
  ```json
  {
    "title": "New Blank Sailings advisory",
    "category": "Industry Updates",
    "status": "Draft",
    "image": "..."
  }
  ```
* **Response (200 OK)**:
  ```json
  { "success": true, "blog": { "id": "BLG-404", ... } }
  ```

#### `PUT /api/blogs/[id]`
Modifies blog content or publishes draft.

* **Response (200 OK)**:
  ```json
  { "success": true }
  ```

#### `DELETE /api/blogs/[id]`
Permanently deletes blog advisory.

---

### 4. Freight Rates
#### `GET /api/rates`
Retrieves maritime shipping rates with search filters.

* **Success Response (200 OK)**:
  ```json
  [
    {
      "id": "RTE-301",
      "origin": "INNSV (Nhava Sheva)",
      "destination": "NLRTM (Rotterdam)",
      "container": "40ft HC",
      "cost": 2450,
      "transit": 25,
      "validity": "2026-08-15"
    }
  ]
  ```

#### `POST /api/rates`
Registers a new route rate pricing.

#### `PUT /api/rates/[id]`
Modifies existing route pricing.

#### `DELETE /api/rates/[id]`
Permanently deletes rate route.

#### `POST /api/rates/bulk`
Simulates bulk uploading/merging via CSV parser.

---

### 5. KYC Documents
#### `GET /api/documents`
Retrieves KYC files list.

#### `PUT /api/documents/[id]`
Approves or Rejects a verification compliance checklist.

* **Request Body (JSON)**:
  ```json
  {
    "status": "Approved",
    "remarks": "Registry matches company certificate details."
  }
  ```

---

### 6. Security Audit Events
#### `GET /api/audit-logs`
Returns chronologically sorted console audit records.
