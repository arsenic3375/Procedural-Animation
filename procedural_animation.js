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

    difference(a) {
        return new Vector(a.x-this.x, a.y-this.y);
    }

    sum(a) {
        return new Vector(a.x+this.x, a.y+this.y);
    }
    
    draw(color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, 2*Math.PI);        
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

class Conection {
    constructor(radius, startAngle, endAngle, node) {
        this.radius = radius;
        this.startAngle = startAngle;
        this.endAngle = endAngle;
        this.node = node;
    }

    constrain(node) {
        let r = node.coordinate.difference(this.node.coordinate);

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
        /*console.log(`(${this.startAngle}, ${this.endAngle})\n
                     ${node.direction.angle() * 180 / Math.PI}\n
                     ${r.angle() * 180 / Math.PI}\n
                     ${relativeAngle * 180 / Math.PI}`);*/
        
        if(relativeAngle < this.startAngle || relativeAngle > this.endAngle) {
            let differenceStart  = Math.abs(relativeAngle - this.startAngle);
            let differenceEnd    = Math.abs(this.endAngle - relativeAngle);
            
            let distanceToStart = Math.min(differenceStart, 2*Math.PI - differenceStart);
            let distanceToEnd   = Math.min(differenceEnd, 2*Math.PI - differenceEnd);
            //console.log(`(${distanceToStart*180/Math.PI}, ${distanceToEnd*180/Math.PI})`)
            
            if(distanceToStart < distanceToEnd) {
                
                let result = new Vector(Math.cos(this.startAngle + node.direction.angle()), 
                                        Math.sin(this.startAngle + node.direction.angle()))
                                        .scale(this.radius)
                                        .sum(node.coordinate);
                /*
                new Vector(Math.cos(this.startAngle + node.direction.angle()), 
                           Math.sin(this.startAngle + node.direction.angle()))
                           .scale(this.radius)
                           .draw(node.coordinate, 'rgb(255, 0, 0)');
                */
                this.node.coordinate = new Point(result.x, result.y);
                
                
                //console.log("START");
            }

            
            if(distanceToStart > distanceToEnd) {
                
                let result = new Vector(Math.cos(this.endAngle + node.direction.angle()), 
                                        Math.sin(this.endAngle + node.direction.angle()))
                                        .scale(this.radius)
                                        .sum(node.coordinate);
                /*
                new Vector(Math.cos(this.endAngle + node.direction.angle()), 
                           Math.sin(this.endAngle + node.direction.angle()))
                           .scale(this.radius)
                           .draw(node.coordinate, 'rgb(0, 0, 255)');
                */
                this.node.coordinate = new Point(result.x, result.y);
                
                //console.log("END");
            }
            
            //console.log("out of bounds");
        }
        

        this.node.direction = this.node.coordinate.difference(node.coordinate).normal();

        this.node.constrain();
    }

    draw(node) {
        /*
        ctx.strokeStyle = "rgb(255, 255, 255)";
        ctx.beginPath();
        ctx.moveTo(node.coordinate.x, node.coordinate.y)
        ctx.arc(node.coordinate.x, node.coordinate.y, this.radius, this.startAngle + node.direction.angle(), this.endAngle + node.direction.angle());        
        ctx.closePath();
        ctx.stroke();
        */
        
        let points = []

        /*
        let startX = node.coordinate.x + Math.cos(this.startAngle + node.direction.angle()) * this.radius;
        let startY = node.coordinate.y + Math.sin(this.startAngle + node.direction.angle()) * this.radius;
        new Point(startX, startY).draw("rgb(255, 0, 0)")
        points.push(new Point(startX, startY));
        */
        let arr = this.node.draw()
        points = points.concat(arr);

        /*
        let endX = node.coordinate.x + Math.cos(this.endAngle + node.direction.angle()) * this.radius;
        let endY = node.coordinate.y + Math.sin(this.endAngle + node.direction.angle()) * this.radius;
        new Point(endX, endY).draw("rgb(0, 0, 255)");
        points.push(new Point(endX, endY));
        */
        return points;
    }
}

class Edge {
    constructor(radius, angle) {
        this.radius = radius;
        this.angle = angle;
    }

    draw(node) {
        let x = node.coordinate.x + Math.cos(this.angle + node.direction.angle()) * this.radius;
        let y = node.coordinate.y + Math.sin(this.angle + node.direction.angle()) * this.radius;
        let p = new Point(x, y);
        //p.draw("rgb(255, 0, 0)");
        return [p];
    }
}

class Node {
    constructor(coordinate, direction, attachments) {
        this.coordinate = coordinate;
        this.direction = direction;
        this.attachments = attachments;
    }

    constrain() {
        //console.log(this.coordinate);
        this.attachments.filter(attachment => attachment instanceof Conection).forEach(conection => {
            conection.constrain(this);
        });
    }

    draw() {
        let points = [];

        /*
        if(this.attachments.length == 0) {
            let l = new Point(this.coordinate.x - this.direction.scale(10).y, this.coordinate.y + this.direction.scale(10).x);
            l.draw("rgb(255, 0, 0)");
            points.push(l);

            let p = new Point(this.coordinate.x - this.direction.scale(10).x, this.coordinate.y - this.direction.scale(10).y);
            p.draw("rgb(0, 255, 0)");
            points.push(p);

            let r = new Point(this.coordinate.x + this.direction.scale(10).y, this.coordinate.y - this.direction.scale(10).x);
            r.draw("rgb(0, 0, 255)");
            points.push(r);
        }
        else {
        */
            //this.coordinate.draw("rgb(255, 255, 255)");
            /*
            let l = new Point(this.coordinate.x - this.direction.scale(10).y, this.coordinate.y + this.direction.scale(10).x);
            l.draw("rgb(255, 0, 0)");
            points.push(l);
            */
            /*
            new Point(this.coordinate.x - this.direction.scale(10).y, this.coordinate.y + this.direction.scale(10).x).draw("rgb(255, 0, 0)");
            new Point(this.coordinate.x + this.direction.scale(10).y, this.coordinate.y - this.direction.scale(10).x).draw("rgb(0, 0, 255)");
            */
            //this.direction.scale(10).draw(this.coordinate, "rgb(255, 255, 255)");
            
            this.attachments.forEach(attachment => {
                points = points.concat(attachment.draw(this));
            });
            /*
            let r = new Point(this.coordinate.x + this.direction.scale(10).y, this.coordinate.y - this.direction.scale(10).x);
            r.draw("rgb(0, 0, 255)");
            points.push(r);
            */
        //}
        return points;
    }
}

let mouse = new Point(0, 0);

canvas.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});

function createLeg(length, startRadius, endRadius) {
    if(length <= 1) {
        return new Node(new Point(400, 400), new Vector(1, 0), [new Edge(startRadius, (1/2)*Math.PI), 
                                                                new Edge(startRadius, (2/2)*Math.PI), 
                                                                new Edge(startRadius, (3/2)*Math.PI)]);
    }

    return new Node(new Point(400, 400), new Vector(1, 0), [new Edge(startRadius, (1/2)*Math.PI), 
                                                            new Conection(20, (5/6)*Math.PI, (7/6)*Math.PI, createLeg(length-1, startRadius + (endRadius-startRadius) / (length - 1), endRadius)), 
                                                            new Edge(startRadius, (3/2)*Math.PI)])
}

let root   = new Node(new Point(100, 100), new Vector(1, 0), [new Conection(30, (0/6)*Math.PI, (1/6)*Math.PI, createLeg(10, 10, 1)),
                                                              new Conection(30, (2/6)*Math.PI, (3/6)*Math.PI, createLeg(10, 10, 1)),
                                                              new Conection(30, (4/6)*Math.PI, (5/6)*Math.PI, createLeg(10, 10, 1)),
                                                              new Conection(30, (6/6)*Math.PI, (7/6)*Math.PI, createLeg(10, 10, 1)),
                                                              new Conection(30, (8/6)*Math.PI, (9/6)*Math.PI, createLeg(10, 10, 1)),
                                                              new Conection(30, (10/6)*Math.PI, (11/6)*Math.PI, createLeg(10, 10, 1))]);


//root = createLeg(100, 10, 5);
function drawSmoothCurve(points, tension = 1) {
    ctx.strokeStyle = "rgb(255, 255, 255)";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[0];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6 * tension;
        const cp1y = p1.y + (p2.y - p0.y) / 6 * tension;
        const cp2x = p2.x - (p3.x - p1.x) / 6 * tension;
        const cp2y = p2.y - (p3.y - p1.y) / 6 * tension;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }

    ctx.stroke();
}

function draw() {
    background('rgb(0, 0, 0)');
   
    //root.follow(mouse, 1);
    //root.direction = root.coordinate.difference(mouse);
    //console.log(root.direction);
    //root.direction = root.coordinate.difference(mouse).normal();
    root.coordinate = mouse;
    root.constrain();
    /*
    root.draw().forEach(element => {
        element.draw("rgb(255, 255, 255)");
    });
    */
    drawSmoothCurve(root.draw());
    //debugger;
}

setInterval(draw, 10);