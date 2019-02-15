/*Version du 15/02/2019
 Alexandre Cormier*/

 /* Change le peg choisi par les transform gates de la scene ou du groupe séléctioné comutation entre 0 et 1*/
/* Si le rig contient un Drawing nommé "REVERSE_HIERARCHY" sa substituion exposée comutera  entre 0 et
/* le script cherche les nodes en question dans le groupe parent du node selectionné et dans tout les sous groupes*/


function AL_Reverse_Hierarchy(){

	MessageLog.trace( "---AL_Reverse_hierarchy---");


	
	/**************************** V A R I A B L E S **************************/



	var selectedNodes = selection.numberOfNodesSelected(); 
	var cf = frame.current(); 
	var root_node = "";
	var relevent_types = ["TransformGate","READ","PEG"];
	
	/*VARIABLES : NODES LIST */
	var drawings_to_treat=[];
	var pegs_to_treat=[];
	var TG_to_treat=[];

	/* VARIABLES : BONES */
	var UP_PEG = [];
	var DOWN_PEG = [];

	var UP_BONES = []
	var DOWN_BONES = []

	/* VARIABLES :REGEX */
	var peg_regex = /\bUp_|\bDown_|g/;
	var handles_regex = /REVERSE_HIERARCHY/g

	var START_ORDER  = ""




	/**************************** E X E C U T I O N ***********************/



	MessageLog.trace( "-------AL_Reverse_hierarchy-------");
	
	scene.beginUndoRedoAccum("AL_Reverse_Hierarchy"); 

	fetch_nodes();
	treat_nodes();
	Build_Bones();
 	Update_angles()
	//Replace_Down_femur()

	
	
	scene.endUndoRedoAccum();  
	
	MessageLog.trace( "--------ENDLOG-");

 


	/************************** F U N C T I O N S **************************/



	function fetch_nodes(){ 
		
		//Rassemble les nodes à traiter 
		var groups_to_analyse = [];
		
		var selected_nodes = selection.selectedNodes(0);
		
		root_node = selected_nodes[0];
		
		var parent_group = 	node.parentNode(root_node) ;
		
		groups_to_analyse.push(parent_group);
		
		if( selection.numberOfNodesSelected()>0){ 

				MessageLog.trace( "NODES_SELECTED  "+selection.numberOfNodesSelected());
				
				var selected_nodes = selection.selectedNodes(0);

				//Première boucle parmis les nodes selectionnés
				for(var n = 0; n < selection.numberOfNodesSelected(); n++){ 

					var currentNode = selected_nodes[n];

					if(node.type(currentNode)=="GROUP"){
						
						groups_to_analyse.push(currentNode);

					} 

				}  

				var number_of_groups = groups_to_analyse.length;

				MessageLog.trace( "GROUPS SELECTED "+number_of_groups);
				
				//deuxième boucle recursive à travers les groupes 
				for (var g = 0 ; g < number_of_groups ; g ++){
					
					currentGroup = groups_to_analyse[g];
					var subNodesInGroup= node.numberOfSubNodes(currentGroup);
					
					for (var sn = 0 ; sn < subNodesInGroup; sn++){

						var sub_node_name = node.subNode(currentGroup,sn);
						var sub_node = node.subNodeByName(currentGroup,sub_node_name);
						var sub_node_type = node.type(sub_node_name);

						var shortname = getShortName(sub_node_name)

						switch(sub_node_type ){

							case "GROUP" :
								groups_to_analyse.push(sub_node_name);
								number_of_groups++;

							break;
							case "READ" :
								if(check_name_pattern(shortname,handles_regex)){
									drawings_to_treat.push(sub_node_name);
								}
							break;
							case "PEG" :
								if(check_name_pattern(shortname,peg_regex)){
									pegs_to_treat.push(sub_node_name);
									Store_Peg(sub_node_name);
								} 

							break;
							case "TransformGate" :
								TG_to_treat.push(sub_node_name)
							break;
						}

							
					}			
					
				}

			}else{  

			} 	
				
	}

	function detect_hierarchy(){



	}

	function treat_nodes(){
		
		var START_STATE = 1;

		//BOUCLE PARMIS LES TRANSFORM GATE
		for (var t = 0 ; t < TG_to_treat.length ; t ++){

			if(node.type(TG_to_treat[t]) ==relevent_types[0]){

				var currentTG = TG_to_treat[t];

				if(t == 0){
						START_STATE = node.getTextAttr(currentTG ,cf,"targetGate");

						//Switch on off
						if(START_STATE == 0){
							START_STATE = 1
							START_ORDER = "UP"
						}else{
							START_ORDER = "DOWN"
							START_STATE = 0
						}
						
				}

				change_targetGate(currentTG,START_STATE);
				selection.addNodeToSelection(currentTG); 

			}
			
		} 

		//BOUCLE PARMIS LES DRAWINGS
		for (var d = 0 ; d < drawings_to_treat.length ; d ++){

			var currentDrawing = drawings_to_treat[d];

			Change_Drawing_Sub_To(currentDrawing,START_STATE);

		}

		MessageLog.trace("START_STATE "+START_STATE)

	}

	function Update_angles(){

		switch(START_ORDER){

			case "UP" : 
				MessageLog.trace("Angles Up tp Down")
				Mimic_Up_angles_to_Down_angles()
			break;
			case "DOWN" :
				MessageLog.trace("Angles Down to Up")
				Mimic_Down_angles_to_Up_angles()
			break;


		}



	}
	function Update_positions(){

		switch(START_ORDER){

			case "UP" : 
				MessageLog.trace("Position Up tp Down")
				Mimic_Up_angles_to_Down_angles()
			break;
			case "DOWN" :
				MessageLog.trace("Position Down to Up")
				Mimic_Down_angles_to_Up_angles()
			break;


		}



	}


	/*FUNCTIONS TREATING TRANSFORM GATE*/

	function change_targetGate(n,g){

		/*Creer une colmun si elle n'exoste pas 
		change la valuer et creer une clef dans cette column*/

		var TGcolumn = node.linkedColumn(n,"targetGate");

		if(TGcolumn != ""){

			column.setEntry(TGcolumn,0,cf,g);
			column.setKeyFrame(TGcolumn,cf);

		}else{


			MessageLog.trace("adding new column")
			var columnName = n+"_Reverse_Hierarchy";

			TGcolumn = column.add(columnName , "BEZIER", "BOTTOM");
			column.setEntry(TGcolumn,0,cf,g);
			column.setKeyFrame(TGcolumn,cf);
			node.linkAttr(n,"targetGate",columnName );
		}

	}

	/* FUNCTION DRAWING*/

	function Change_Drawing_Sub_To(n,sub_name){

		var numLayers = Timeline.numLayers; 
		currentColumn =""; 

		for(var i = 0 ; i<numLayers;i++){

			if(Timeline.layerToNode(i)==n){

				currentColumn = Timeline.layerToColumn(i);
				if(column.type(currentColumn) == "DRAWING"){
					break;
				}
			}
		}


 		if(currentColumn != ""){

			MessageLog.trace(currentColumn);

			MessageLog.trace(column.getDrawingTimings(currentColumn));
			column.setEntry(currentColumn,1,cf,sub_name);

 		}

	}


	/* FUNCTION TREATING PEGS */


	function Store_Peg(p){ 

		MessageLog.trace("STORE PEG")
			
		var peg_name = node.getName(p)
		MessageLog.trace(p);

		switch(peg_name){
			
			case  "Up_FEMUR-P":
				UP_PEG["FEMUR"] = p;
			break;
			case  "Up_TIBIA-P":
				UP_PEG["TIBIA"] = p;
			break;
			case  "Up_CARPE-P":
				UP_PEG["CARPE"] = p;
			break;
			case  "Up_PHALANGES-P":
				UP_PEG["PHALANGES"] = p;
			break;
			case  "Down_FEMUR-P":
				DOWN_PEG["FEMUR"] = p;
			break;
			case  "Down_TIBIA-P":
				DOWN_PEG["TIBIA"] = p;
			break;
			case  "Down_CARPE-P":
				DOWN_PEG["CARPE"] = p;
			break;		
			case  "Down_PHALANGES-P": 
				DOWN_PEG["PHALANGES"] = p;
			break;	
		}
		
	}

	function Build_Bones(){

		MessageLog.trace("BUILD BONES")

		//up

		UP_BONES["FEMUR"] = new Bone(UP_PEG["FEMUR"],UP_PEG["TIBIA"],false);
		UP_BONES["FEMUR"].calculate_Length()

		UP_BONES["TIBIA"] = new Bone(UP_PEG["TIBIA"],UP_PEG["CARPE"],false);
		UP_BONES["TIBIA"].calculate_Length()

		UP_BONES["CARPE"] = new Bone(UP_PEG["CARPE"],UP_PEG["PHALANGES"],false);
		UP_BONES["CARPE"].calculate_Length()

		UP_BONES["PHALANGES"] = new Bone(UP_PEG["PHALANGES"],"",true);


		//down

		DOWN_BONES["FEMUR"] = new Bone(DOWN_PEG["FEMUR"],DOWN_PEG["TIBIA"],false);
		DOWN_BONES["FEMUR"].calculate_Length()

		DOWN_BONES["TIBIA"] = new Bone(DOWN_PEG["TIBIA"],DOWN_PEG["CARPE"],false);
		DOWN_BONES["TIBIA"].calculate_Length()

		DOWN_BONES["CARPE"] = new Bone(DOWN_PEG["CARPE"],DOWN_PEG["PHALANGES"],false);
		DOWN_BONES["CARPE"].calculate_Length()

		DOWN_BONES["PHALANGES"] = new Bone(DOWN_PEG["PHALANGES"],"",true);


	}

	/* CLASS BONE */

	function Bone(rp,ep,isRoot){

		this.rootpeg = rp;
		this.rootpoint = node.getPivot(rp,cf);
		this.length = 0;

		if(isRoot==false){

			this.endpeg = ep;
			this.endpoint = node.getPivot(ep,cf);

		}

		
		

		this.calculate_Length = function(){

			if(isRoot==false){

			/*MessageLog.trace("RX "+ this.rootpoint.x);
			MessageLog.trace("RY "+ this.rootpoint.y);
			MessageLog.trace("Ex "+ this.endpoint.x);
			MessageLog.trace("EY "+ this.endpoint.y);*/

			var Dx = - this.rootpoint.x-this.endpoint.x;
			var Dy = this.rootpoint.y -this.endpoint.y;
			
			var L = Hypothenus(Dy,Dx); 
			
			this.length = L;

			//MessageLog.trace("length of "+this.rootpeg+" : "+this.length );
			
			return L;

			}

		}

		this.getRotation= function(){

			var angle = parseInt(node.getTextAttr(this.rootpeg,cf,"rotation.anglez"));

			//MessageLog.trace("--------"+this.rootpeg+" getRoation result :"+angle)

			return angle 


		}


		this.setRotation= function(angle){

			node.setTextAttr(this.rootpeg,"rotation.anglez", cf,parseInt(angle));
			//MessageLog.trace(angle)

		}

		this.setPosition = function(x,y){

			MessageLog.trace(this.rootpeg+"----setPosition x: "+x+" y: "+y)

			node.setTextAttr(this.rootpeg,"position.x", cf,x);
			node.setTextAttr(this.rootpeg,"position.y", cf,y);


			add_Key_to_attribute(this.rootpeg,"position.x",x,cf);
			add_Key_to_attribute(this.rootpeg,"position.y",y,cf);

		}


		this.getLength = function(){

			//MessageLog.trace("length of the bones :"+this.length)
			return this.length;

		}


		//MessageLog.trace("\n ******* NEW Bone created ");
		//MessageLog.trace("\n ******* root : "+this.rootpeg); 
		//MessageLog.trace("\n ******* end  : "+this.endpeg);

	}

	function add_Key_to_attribute(n,attribute,value,frame){

		var currentColumn = node.linkedColumn(n,attribute);

		if(currentColumn  != ""){

			column.setEntry(currentColumn,0,frame,value);
			column.setKeyFrame(currentColumn,frame);

		}else{


			//MessageLog.trace("adding new column")
			var columnName = n+"_"+attribute;

			currentColumn  = column.add(columnName , "BEZIER", "BOTTOM");
			column.setEntry(currentColumn,0,frame,value);
			column.setKeyFrame(currentColumn,frame);
			node.linkAttr(n,attribute,columnName );

			MessageLog.trace(currentColumn);
		}

	}




	function Mimic_Up_angles_to_Down_angles(){

		MessageLog.trace("Mimic_Up_angles_to_Down_angles")

		var F1 =  UP_BONES["FEMUR"].getRotation()
		var T1 =  UP_BONES["TIBIA"].getRotation()
		var C1 =  UP_BONES["CARPE"].getRotation()
		var P1 =  UP_BONES["PHALANGES"].getRotation()



	 	var P2 = -C1
		var C2=  -T1
		var T2 = -F1
		var F2 = F1+T1+C1+P1


		MessageLog.trace("fd "+F2)
		MessageLog.trace("td "+T2)
		MessageLog.trace("cd "+C2)
		MessageLog.trace("pd "+P2)

		DOWN_BONES["FEMUR"].setRotation(F2)
		DOWN_BONES["TIBIA"].setRotation(T2)
		DOWN_BONES["CARPE"].setRotation(C2)
		DOWN_BONES["PHALANGES"].setRotation(P2);
		

	}

	function Mimic_Down_angles_to_Up_angles(){

		MessageLog.trace("Mimic_Down_angles_to_Up_angles")

		var F1 =  DOWN_BONES["FEMUR"].getRotation()
		var T1 =  DOWN_BONES["TIBIA"].getRotation()
		var C1 =  DOWN_BONES["CARPE"].getRotation()
		var P1 =  DOWN_BONES["PHALANGES"].getRotation()


		var P2 = F1+T1+C1+P1
		var C2 = -P1
		var T2=  -C1
	 	var F2 = -T1

		MessageLog.trace("fd "+F2)
		MessageLog.trace("td "+T2)
		MessageLog.trace("cd "+C2)
		MessageLog.trace("pd "+P2)

		UP_BONES["FEMUR"].setRotation(F2)
		UP_BONES["TIBIA"].setRotation(T2)
		UP_BONES["CARPE"].setRotation(C2)
		UP_BONES["PHALANGES"].setRotation(P2);
		

	}

	function Replace_Down_femur(){

			MessageLog.trace("***************************  Replace_Down_femur")



			var FU =  UP_BONES["FEMUR"].getRotation()
			var TU =  UP_BONES["TIBIA"].getRotation()
			var CU =  UP_BONES["CARPE"].getRotation()
			var PU =  UP_BONES["PHALANGES"].getRotation()

			var A = UP_BONES["FEMUR"].getLength()
			var B = UP_BONES["TIBIA"].getLength()
			var C = UP_BONES["CARPE"].getLength()
			var D = 0//DOWN_BONES["PHALANGES"].getLength();




			/*var TX =-(Math.sin(radian(FU))*A+Math.sin(radian(FU+TU))*B+Math.sin(radian(FU+TU+CU))*C+Math.sin(radian(FU+TU+CU+PU))*D)
			var TY  =Math.cos(radian(FU))*A+Math.cos(radian(FU+TU))*B+Math.cos(radian(FU+TU+CU))*C+Math.cos(radian(FU+TU+CU+PU))*D-(A+B+C+D)*/

			var TX =-(Math.sin(radian(PU))*D+Math.sin(radian(PU+CU))*C+Math.sin(radian(PU+CU+TU))*B+Math.sin(radian(PU+CU+TU+FU))*A)
			var TY =Math.cos(radian(PU))*D+Math.cos(radian(PU+CU))*C+Math.cos(radian(PU+CU+TU))*B+Math.cos(radian(PU+CU+TU+FU))*A-(A+B+C+D)
			MessageLog.trace("TX = "+TX);
			MessageLog.trace("TY = "+TY);


			DOWN_BONES["FEMUR"].setPosition(TX*0.1,TY*0.1)
			//DOWN_BONES["FEMUR"].setPosition(0,0)
			

	}


	function oldMimic_Rotation(){

	
		MessageLog.trace(peg_list);
		MessageLog.trace(ORDER_A);
		MessageLog.trace(ORDER_B);
		
		var Angles_A = []
		var Angles_B = []
		
		var FA =  Angles_A["FEMUR"] = parseInt(node.getTextAttr(ORDER_A[0], cf,"rotation.anglez"));
		var TA =  Angles_A["TIBIA"] =parseInt(node.getTextAttr(ORDER_A[1], cf,"rotation.anglez"));
		var CA =  Angles_A["CARPE"] =parseInt(node.getTextAttr(ORDER_A[2], cf,"rotation.anglez"));


		Angles_B["FEMUR"] =-TA
		Angles_B["TIBIA"] =-CA
		Angles_B["CARPE"] = FA+TA+CA
		

		MessageLog.trace("ANGLES_B : "+Angles_B)

		
		node.setTextAttr(ORDER_B["FEMUR"],"rotation.anglez", cf, Angles_B["FEMUR"]);
		node.setTextAttr(ORDER_B["TIBIA"],"rotation.anglez", cf, Angles_B["TIBIA"]);
		node.setTextAttr(ORDER_B["CARPE"],"rotation.anglez", cf, Angles_B["CARPE"]);
		
		var A = GetBoneLength(ORDER_A[0],"root");
		var B = GetBoneLength(ORDER_A[0],ORDER_A[1]);
		var C = GetBoneLength(ORDER_A[1],ORDER_A[2]);
		
		function radian(a){
				return a*Math.PI/180
		}
		
		var TX =-(Math.sin(radian(FA))*A+Math.sin(radian(FA+TA))*B+Math.sin(radian(FA+TA+CA))*C)
		var TY  =Math.cos(radian(FA))*A+Math.cos(radian(FA+TA))*B+Math.cos(radian(FA+TA+CA))*C-(A+B+C)
		

		node.setTextAttr(ORDER_B["CARPE"],"position.x", cf, TX);
		node.setTextAttr(ORDER_B["CARPE"],"position.y", cf, TY);
		
			MessageLog.trace("tx : "+TX)
			MessageLog.trace("ty : "+TY)
			MessageLog.trace("x : "+parseInt(node.getTextAttr(ORDER_B["CARPE"], cf,"position.x")))
			MessageLog.trace("y : "+parseInt(node.getTextAttr(ORDER_B["CARPE"], cf,"position.y")))
		
		GetBoneLength(ORDER_A[0]);			


	}

	/* FUNCTION UTILS */
	
	function Hypothenus(x,y){
		return Math.sqrt((x*x)+(y*y)); 
	}

	function radian(a){
		return a*Math.PI/180
	}


	function check_name_pattern(n,regex){

		//Verifie sur le nom examiné contient le mots clef 
		if(n.match(regex))MessageLog.trace(n+"--------->match!");
		return n.match(regex);
		
	}
	

	function getShortName(n){
			
		//Extrait le nom du node sans la hierarchie
		split_string = n.split("/")
		return split_string[split_string.length-1];
		
	}


	


}  



	
