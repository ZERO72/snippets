<!DOCTYPE html>
<html>
	<head>
		<title>SMTP email form</title>
		<meta charset="UTF-8">
		<meta http-equiv="content-type" content="text/html;charset=UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
	</head>
	<body>

		<form method="POST" action="email.php" name="subscribe">
			<div class="form-group">
				<input type="text" class="form-control" id="name" placeholder="VOLLEDIGE NAAM" autocomplete="off" maxlength="30" name="name">
			</div>
			<div class="form-group">
				<input type="email" class="form-control" id="email" placeholder="E-MAILADRES" autocomplete="off" maxlength="30" name="email">
			</div>
			<div class="form-group">
				<input type="text" class="form-control" id="school" placeholder="NAAM HOGESCHOOL" autocomplete="off" maxlength="15" name="school">
			</div>
			<div class="form-group">
				<input type="text" class="form-control" id="collegeNumber" placeholder="COLLEGENUMMER" autocomplete="off" maxlength="15" name="collegeNumber">
			</div>
			<input type="hidden" id="socialNetwork" name="socialNetwork"> <!-- Hidden input: hide this field for production  -->
			<input type="hidden" id="socialKey" name="socialKey"> <!-- Hidden input: hide this field for production  -->
		</form>

	</body>
</html>