let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

// Get the DPR and size of the canvas
const dpr = window.devicePixelRatio;
const rect = canvas.getBoundingClientRect();

// Set the "actual" size of the canvas
canvas.width = rect.width * dpr;
canvas.height = rect.height * dpr;

// Scale the context to ensure correct drawing operations
ctx.scale(dpr, dpr);

// Set the "drawn" size of the canvas
canvas.style.width = `${rect.width}px`;
canvas.style.height = `${rect.height}px`;

function background(color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;   
    } 

    diffrence(a) {
        return new Vector(a.x-this.x, a.y-this.y);
    }

    sum(a) {
        return new Vector(a.x+this.x, a.y+this.y);
    }
    
    draw(color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, 2*Math.PI);        
        ctx.closePath();
        ctx.fill();        
    }
}

class Vector extends Point{
    constructor(x, y) {
        super(x, y);  
    } 

    magnitude() {
        return Math.sqrt(this.x**2 + this.y**2);
    }

    angle() {
        let angle = Math.atan2(this.y, this.x);
        if (angle < 0) {
            angle += 2 * Math.PI;
        }
        return angle;
    }

    scale(s) {
        return new Vector(this.x*s, this.y*s);
    }


    normal() {
        return this.scale(1/this.magnitude());
    }

    dotProduct(a) {
        return this.x * a.x + this.y * a.y;
    }

    draw(coordinate, color) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(coordinate.x, coordinate.y);
        ctx.lineTo(coordinate.x+this.x, coordinate.y+this.y);
        ctx.closePath();
        ctx.stroke();
    }
}

class Conection{
    constructor(radius, startAngle, endAngle, node) {
        this.radius = radius;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
        this.node = node;
    }

    constrain(node) {
        let r = node.coordinate.diffrence(this.node.coordinate);

        if(r.magnitude() > this.radius || r.magnitude() < this.radius) {
            let result = this.node.coordinate.sum(r.scale((this.radius-r.magnitude())/r.magnitude()));
            this.node.coordinate = new Point(result.x, result.y);
            //this.node.coordinate.x += (r.x/r.magnitude())*(this.radius - r.magnitude());
            //this.node.coordinate.y += (r.y/r.magnitude())*(this.radius - r.magnitude());
        }

        //let relativeAngle  = Math.acos(r.dotProduct(node.direction)/(r.magnitude()*node.direction.magnitude()));
        let relativeAngle  = r.angle() - node.direction.angle();
        if(relativeAngle < 0) {
            relativeAngle = 2 * Math.PI + relativeAngle;
        }
        console.log(`(${this.startAngle}, ${this.endAngle})\n
                     ${node.direction.angle() * 180 / Math.PI}\n
                     ${r.angle() * 180 / Math.PI}\n
                     ${relativeAngle * 180 / Math.PI}`);
        if(relativeAngle < this.startAngle || relativeAngle > this.endAngle) {
            let diffrenceStart  = Math.abs(relativeAngle - this.startAngle);
            let diffrenceEnd    = Math.abs(this.endAngle - relativeAngle);
            
            let distanceToStart = Math.min(diffrenceStart, 2*Math.PI - diffrenceStart);
            let distanceToEnd   = Math.min(diffrenceEnd, 2*Math.PI - diffrenceEnd);
            //console.log(`(${distanceToStart*180/Math.PI}, ${distanceToEnd*180/Math.PI})`)
            
            if(distanceToStart < distanceToEnd) {
                
                let result = new Vector(Math.cos(this.startAngle + node.direction.angle()), 
                                        Math.sin(this.startAngle + node.direction.angle()))
                                        .scale(this.radius)
                                        .sum(node.coordinate);

                new Vector(Math.cos(this.startAngle + node.direction.angle()), 
                           Math.sin(this.startAngle + node.direction.angle()))
                           .scale(this.radius)
                           .draw(node.coordinate, 'rgb(255, 0, 0)');
                //this.node.coordinate = new Point(result.x, result.y);
                
                
                //console.log("START");
            }

            
            if(distanceToStart > distanceToEnd) {
                
                let result = new Vector(Math.cos(this.endAngle + node.direction.angle()), 
                                        Math.sin(this.endAngle + node.direction.angle()))
                                        .scale(this.radius)
                                        .sum(node.coordinate);

                new Vector(Math.cos(this.endAngle + node.direction.angle()), 
                           Math.sin(this.endAngle + node.direction.angle()))
                           .scale(this.radius)
                           .draw(node.coordinate, 'rgb(0, 0, 255)');
                //this.node.coordinate = new Point(result.x, result.y);
                
                //console.log("END");
            }
            
            //console.log("out of bounds");
        }

        this.node.direction = this.node.coordinate.diffrence(node.coordinate).normal();

        this.node.constrain();
    }

    draw(node, color) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(node.coordinate.x, node.coordinate.y)
        ctx.arc(node.coordinate.x, node.coordinate.y, this.radius, this.startAngle + node.direction.angle(), this.endAngle + node.direction.angle());        
        ctx.closePath();
        ctx.stroke();

        this.node.draw(color);
    }
}

class Node {
    constructor(coordinate, direction, conections) {
        this.coordinate = coordinate;
        this.direction = direction;
        this.conections = conections;
    }

    constrain() {
        this.conections.forEach(conection => {
            conection.constrain(this);
        });
    }

    draw(color) {
        this.coordinate.draw(color);
        this.direction.scale(10).draw(this.coordinate, color);

        this.conections.forEach(conection => {
            conection.draw(this, color);
        });
    }
}

class Follower extends Node {
    constructor(coordinate, direction, conections) {
        super(coordinate, direction, conections);
    }

    follow(b, v) {
        let r = this.coordinate.diffrence(b);

        if(r.magnitude() > 10) {
            let result = this.coordinate.sum(r.scale(v/r.magnitude()));
            this.coordinate = new Point(result.x, result.y);
            //this.node.coordinate.x += (r.x/r.magnitude())*(this.radius - r.magnitude());
            //this.node.coordinate.y += (r.y/r.magnitude())*(this.radius - r.magnitude());
            this.direction = r.normal();
        }
        else {
            //this.direction = new Vector(0, 0);
        }
    }
} 

let mouse = new Point(0, 0);

canvas.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});

let node1d = new Node(new Point(0, 0), new Vector(1, 0), []);
let node1c = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node1d)]);
let node1b = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node1c)]);
let node1a = new Node(new Point(0, 0), new Vector(1, 0), [/*new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node1b)*/]);

let node2d = new Node(new Point(0, 0), new Vector(1, 0), []);
let node2c = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node2d)]);
let node2b = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node2c)]);
let node2a = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node2b)]);

let node3d = new Node(new Point(0, 0), new Vector(1, 0), []);
let node3c = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node3d)]);
let node3b = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node3c)]);
let node3a = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node3b)]);


let node4d = new Node(new Point(0, 0), new Vector(1, 0), []);
let node4c = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node4d)]);
let node4b = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node4c)]);
let node4a = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node4b)]);


let node5d = new Node(new Point(0, 0), new Vector(1, 0), []);
let node5c = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node5d)]);
let node5b = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node5c)]);
let node5a = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node5b)]);


let node6d = new Node(new Point(0, 0), new Vector(1, 0), []);
let node6c = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node6d)]);
let node6b = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node6c)]);
let node6a = new Node(new Point(0, 0), new Vector(1, 0), [new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, node6b)]);

let root   = new Node(new Point(0, 0), new Vector(1, 0), [//new Conection(20, (0/6)*Math.PI, (2/6)*Math.PI, node1a), 
                                                          //new Conection(20, (2/6)*Math.PI, (4/6)*Math.PI, node2a), 
                                                          //new Conection(20, (4/6)*Math.PI, (6/6)*Math.PI, node3a),
                                                          //new Conection(20, (6/6)*Math.PI, (8/6)*Math.PI, node4a), 
                                                          //new Conection(20, (8/6)*Math.PI, (10/6)*Math.PI, node5a), 
                                                          //new Conection(20, (10/6)*Math.PI, (12/6)*Math.PI, node6a)]);
                                                          new Conection(20, (0/6)*Math.PI, (11/6)*Math.PI, node1a)]);


function draw() {
    background('rgb(0, 0, 0)');
   
    //root.follow(mouse, 1);
    //root.direction = root.coordinate.diffrence(mouse);
    //console.log(root.direction);
    root.coordinate = mouse;
    root.constrain();
    root.draw('rgb(255, 255, 255)');
}

setInterval(draw, 10);