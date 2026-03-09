import * as THREE from 'three';
import gsap from 'gsap';

const metalRackMat = new THREE.MeshStandardMaterial({
    color: 0x5a6370,
    roughness: 0.5,
    metalness: 0.8
});

const shelfPlateMat = new THREE.MeshStandardMaterial({
    color: 0xbdc3c7,
    roughness: 0.8
});

const boxColors = [0xff4757,0x2ed573,0x1e90ff,0xffa502,0x3742fa,0xe84118,0xfbc531];
const boxGeo = new THREE.BoxGeometry(0.7,0.7,0.7);

const shelfWidth = 3.2;
const shelfDepth = 1.4;
const shelfHeight = 3.5;
const legThickness = 0.12;

export class StockBlock {

constructor(x,z,shelves){

    this.group = new THREE.Group();
    this.group.position.set(x,0,z);

    this.shelfHitZones=[];

    this.createShelvesAndBoxes(shelves);

}

createShelvesAndBoxes(shelves){

    const levels=[0.8,2.0,3.2];

    let shelfIndex=0;

    for(let row=0;row<2;row++){

        for(let col=0;col<3;col++){

            const shelfData=shelves[shelfIndex];

            if(!shelfData) continue;

            const posX=(row*5.0)-2.5;
            const posZ=(col*3.5)-3.5;

            const rack=this.createWarehouseRack(posX,posZ,shelfData);

            this.group.add(rack);

            levels.forEach(levelY=>{

                const numBoxes=Math.floor(Math.random()*4);

                for(let i=0;i<numBoxes;i++){

                    const box=new THREE.Mesh(
                        boxGeo,
                        new THREE.MeshStandardMaterial({
                            color:boxColors[Math.floor(Math.random()*boxColors.length)],
                            roughness:0.8
                        })
                    );

                    box.position.set(
                        posX+(Math.random()-0.5)*2.2,
                        levelY+0.35,
                        posZ+(Math.random()-0.5)*0.8
                    );

                    box.rotation.y=(Math.random()-0.5)*0.5;

                    box.castShadow=true;

                    this.group.add(box);

                }

            });

            shelfIndex++;

        }

    }

}

createWarehouseRack(posX,posZ,shelfData){

    const rackGroup=new THREE.Group();
    rackGroup.position.set(posX,0,posZ);

    const postGeo=new THREE.BoxGeometry(
        legThickness,
        shelfHeight,
        legThickness
    );

    const postPositions=[
        [-shelfWidth/2,shelfHeight/2,shelfDepth/2],
        [shelfWidth/2,shelfHeight/2,shelfDepth/2],
        [-shelfWidth/2,shelfHeight/2,-shelfDepth/2],
        [shelfWidth/2,shelfHeight/2,-shelfDepth/2]
    ];

    postPositions.forEach(p=>{

        const post=new THREE.Mesh(postGeo,metalRackMat);

        post.position.set(p[0],p[1],p[2]);

        post.castShadow=true;

        rackGroup.add(post);

    });

    const levels=[0.8,2.0,3.2];

    const beamGeo=new THREE.BoxGeometry(shelfWidth,0.1,0.1);
    const plateGeo=new THREE.BoxGeometry(shelfWidth-0.1,0.05,shelfDepth-0.1);

    levels.forEach(y=>{

        const frontBeam=new THREE.Mesh(beamGeo,metalRackMat);
        frontBeam.position.set(0,y,shelfDepth/2);
        rackGroup.add(frontBeam);

        const backBeam=new THREE.Mesh(beamGeo,metalRackMat);
        backBeam.position.set(0,y,-shelfDepth/2);
        rackGroup.add(backBeam);

        const plate=new THREE.Mesh(plateGeo,shelfPlateMat);
        plate.position.set(0,y,0);
        plate.receiveShadow=true;

        rackGroup.add(plate);

    });

    const braceGeo=new THREE.BoxGeometry(0.05,shelfHeight*1.05,0.05);

    [[-shelfWidth/2,0],[shelfWidth/2,0]].forEach(side=>{

        const brace1=new THREE.Mesh(braceGeo,metalRackMat);
        brace1.position.set(side[0],shelfHeight/2,0);
        brace1.rotation.x=Math.PI/4;

        rackGroup.add(brace1);

        const brace2=brace1.clone();
        brace2.rotation.x=-Math.PI/4;

        rackGroup.add(brace2);

    });

    const hitGeo=new THREE.BoxGeometry(
        shelfWidth+0.2,
        shelfHeight,
        shelfDepth+0.2
    );

    const hitMat=new THREE.MeshBasicMaterial({
        visible:false,
        transparent:true,
        opacity:0
    });
    const hitZone=new THREE.Mesh(hitGeo,hitMat);

    hitZone.position.y=shelfHeight/2;

    const borderGeo=new THREE.BoxGeometry(
        shelfWidth+0.3,
        shelfHeight+0.1,
        shelfDepth+0.3
    );

    const borderMat=new THREE.MeshBasicMaterial({
        color:0x00e5ff,
        wireframe:true,
        transparent:true,
        opacity:0
    });

    const border=new THREE.Mesh(borderGeo,borderMat);

    border.position.y=shelfHeight/2;

    hitZone.userData={
        borderMat:borderMat,
        id:shelfData.shelf_id,
        capacity:shelfData.capacity,
        stock_id:shelfData.stock_id
    };

    rackGroup.add(hitZone);
    rackGroup.add(border);

    this.shelfHitZones.push(hitZone);

    return rackGroup;

}

static hoverEffect(hitZone,isIn){

    if(hitZone && hitZone.userData.borderMat){

        gsap.to(hitZone.userData.borderMat,{
            duration:0.2,
            opacity:isIn?1.0:0.0
        });

    }

}

}