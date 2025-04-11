require("dotenv").config();
const express = require("express");
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const cors = require("cors");
const JWTToken = require("jsonwebtoken");
const jwtKey = "ecomm";
require("./db/config");
const User = require("./db/SchemaModels/User");
const Product = require("./db/SchemaModels/AddProduct");
const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.json());
app.use(cors());

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Node Js API for ECOM",
      version: "1.0.0",
    },
    servers: [
      {
        api: "https://backend-node-black-kappa.vercel.app",
      },
    ],
  },
  apis: ["./app.js"],
};

const swaggerSpec = swaggerJSDoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.post("/register", async (req, res) => {
  let user = new User(req.body);
  let result = await user.save();
  result = result.toObject();
  delete result.password;
  if (result) {
    JWTToken.sign({ result }, jwtKey, { expiresIn: "2h" }, (err, token) => {
      console.log(token);
      if (err) {
        res.send({ result: "Something went wrong" });
      } else {
        res.send({ result, auth: token });
      }
    });
  } else {
    res.send({ result: "No User found" });
  }
});

app.post("/login", async (req, res) => {
  if (req.body.password && req.body.email) {
    let user = await User.findOne(req.body).select("-password");
    if (user) {
      JWTToken.sign({ user }, jwtKey, { expiresIn: "2h" }, (err, token) => {
        console.log(token);
        if (err) {
          res.send({ result: "Something went wrong" });
        } else {
          res.send({ user, auth: token });
        }
      });
    } else {
      res.send({ result: "No User found" });
    }
  } else {
    res.send({ result: "No Result found" });
  }
});

app.post("/addProduct", verifyToken, async (req, res) => {
  let products = new Product(req.body);
  let result = await products.save();
  res.send(result);
});

app.get("/products", verifyToken, async (req, res) => {
  let products = await Product.find();
  if (products.length > 0) {
    res.send(products);
  } else {
    res.send({ result: "No product found." });
  }
});

app.delete("/product/:id", verifyToken, async (req, res) => {
  const result = await Product.deleteOne({ _id: req.params.id });
  res.send(result);
});

app.get("/product/:id", verifyToken, async (req, res) => {
  const result = await Product.findOne({ _id: req.params.id });
  if (result) {
    res.send(result);
  } else {
    res.send({ result: "No record found" });
  }
});

app.put("/product/:id", verifyToken, async (req, res) => {
  const result = await Product.updateOne(
    { _id: req.params.id },
    {
      $set: req.body,
    }
  );
  res.send(result);
});

app.get("/search/:key", verifyToken, async (req, res) => {
  const result = await Product.find({
    $or: [
      { name: { $regex: req.params.key } },
      { price: { $regex: req.params.key } },
      { category: { $regex: req.params.key } },
      { company: { $regex: req.params.key } },
    ],
  });
  res.send(result);
});

function verifyToken(req, res, next) {
  let token = req.headers["authorization"];
  if (token) {
    token = token.split(" ")[1];
    JWTToken.verify(token, jwtKey, (err, validated) => {
      if (err) res.status(401).send({ result: "Please Provide Valid Token" });
      next();
    });
  } else {
    res.status(403).send({ result: "Please add Token" });
  }
}

app.listen(PORT, () => {
  console.log(`Node app is listening on Post: ${PORT}`);
});
