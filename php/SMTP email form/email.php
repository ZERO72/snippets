<?php 

	//SMTP needs accurate times, and the PHP time zone MUST be set
	//This should be done in your php.ini, but this is how to do it if you don't have access to that

	date_default_timezone_set('Etc/UTC');

	require 'scripts/PHPMailerAutoload.php';

	$mail = new PHPMailer;

	//Tell PHPMailer to use SMTP
	$mail->isSMTP();
	//Enable SMTP debugging
	// 0 = off (for production use)
	// 1 = client messages
	// 2 = client and server messages
	$mail->SMTPDebug = 2;
	//Ask for HTML-friendly debug output
	$mail->Debugoutput = 'html';
	//Set the hostname of the mail server
	$mail->Host = "mail.webreus.nl";
	//Set the SMTP port number - likely to be 25, 465 or 587
	$mail->Port = 25;
	//Whether to use SMTP authentication
	$mail->SMTPAuth = true;
	//Username to use for SMTP authentication
	$mail->Username = "noreply@dutchcollegeleague.nl";
	//Password to use for SMTP authentication
	$mail->Password = "!LegendsOfTheYear5";



	//Set who the message is to be sent from
	$mail->setFrom('noreply@dutchcollegeleague.nl', 'dutchcollegeleague.nl');
	//Set an alternative reply-to address
	// $mail->addReplyTo('frans@zero72.com', 'Frans Oudelaar');
	//Set who the message is to be sent to
	$mail->addAddress('team@dutchcollegeleague.nl');



	// Form information
	$name = $_POST['name'];
	$email = $_POST['email'];
	$school = $_POST['school'];
	$collegeNumber = $_POST['collegeNumber'];
	$socialNetwork = $_POST['socialNetwork'];
	$socialKey = $_POST['socialKey'];

	//Set the subject line
	$mail->Subject = 'Inschrijving van '.$name.', '.$email;

	//Replace the plain text body with one created manually
	$mail->Body = "Naam: ".$name."<br> E-mail: ".$email."<br> School: ".$school."<br> Collegenummer: ".$collegeNumber."<br> Social network: ".$socialNetwork."<br> Social key: ".$socialKey;
	$mail->AltBody = "Naam: ".$name."\nE-mail: ".$email."\nSchool: ".$school."\nCollegenummer: ".$collegeNumber."\nSocial network: ".$socialNetwork."\nSocial key: ".$socialKey;



	//send the message, check for errors
	if (!$mail->send()) {
		echo "Mailer Error: " . $mail->ErrorInfo;
	} else {
		// echo "Je inschrijving is voltooid! Bedankt voor je inschrijving.";
		echo "<script type='text/javascript'>alert('Je inschrijving is voltooid! Bedankt voor je inschrijving.'); window.location = '/'; </script>";
	}

?>