"""
Class Name: WeaponManagerAPI
Created by: Jun
Version: 2.0
Create Date: 2019-10-14
Description: A RESTFul API for the WeaponManager
Last Modified:
- [2019-10-16: Jun] convert id into integer
- [2019-12-01 :Jun] adjust the class to adapt to the SQLAlchemy
"""


from flask import Flask, request
import json
from sword import Sword
from firearm import Firearm
from weapon_manager import WeaponManager
from datetime import datetime


app = Flask(__name__)
my_weapon_warehouse = WeaponManager("weapons.sqlite")


@app.route('/weaponwarehouse/weapons', methods=['POST'])
def add_weapon():
    """ Add a new Sword or Firearm to WeaponManager """
    content = request.json
    try:
        if content["type"] == "Sword":
            sword = Sword(
                        content["name"],
                        content["materials"],
                        bool(content["is_cold_weapon"]),
                        bool(content["is_inuse"]),
                        datetime.strptime(content["manufacture_date"], "%Y-%m-%d"),
                        float(content["sharp"]),
                        float(content["length"]),
                        bool(content["is_double_edged"])
                    )
            my_weapon_warehouse.add(sword)
        else:
            firearm = Firearm(
                        content["name"],
                        content["materials"],
                        bool(content["is_cold_weapon"]),
                        bool(content["is_inuse"]),
                        datetime.strptime(content["manufacture_date"], "%Y-%m-%d"),
                        int(content["bullets_num"]),
                        float(content["range"])
                      )
            my_weapon_warehouse.add(firearm)
        response = app.response_class(
            status=200 # success
        )
    except ValueError as e:
        response = app.response_class(
        response=str(e),
        status=400 # failure
    )
    return response


@app.route('/weaponwarehouse/weapons/<id>', methods=['PUT'])
def update_weapon(id):
    """ update a weapon in the weapon in the WeaponManager """
    content = request.json
    try:
        if content["type"] == "Sword":
            sword = Sword(
                content["name"],
                content["materials"],
                bool(content["is_cold_weapon"]),
                bool(content["is_inuse"]),
                datetime.strptime(content["manufacture_date"], "%Y-%m-%d"),
                float(content["sharp"]),
                float(content["length"]),
                bool(content["is_double_edged"])
            )
            sword.id = int(id)
            my_weapon_warehouse.update(sword)
        else:
            firearm = Firearm(
                content["name"],
                content["materials"],
                bool(content["is_cold_weapon"]),
                bool(content["is_inuse"]),
                datetime.strptime(content["manufacture_date"], "%Y-%m-%d"),
                int(content["bullets_num"]),
                float(content["range"])
            )
            firearm.id = int(id)
            my_weapon_warehouse.update(firearm)
        response = app.response_class(
            status=200,
            response="Success",
            mimetype='application/json'
        )
    except ValueError as e:
        response = app.response_class(
            response=str(e),
            status=404
        )
    return response


@app.route('/weaponwarehouse/weapons/<id>', methods=['DELETE'])
def delete_weapon(id):
    """ Deletes an existing Sword or Firearm from the WeaponManager """
    try:
        my_weapon_warehouse.delete(int(id))
        response = app.response_class(
            status=200
        )
    except ValueError as e:
        response = app.response_class(
            response=str(e),
            status=404
        )
    return response


@app.route('/weaponwarehouse/weapons/<id>', methods=['GET'])
def get_weapon(id):
    """ Get an existing Sword or Firearm from the WeaponManager """
    try:
        weapon = my_weapon_warehouse.get(int(id))
        if weapon is None:
            raise ValueError("No such weapon!")
        response = app.response_class(
            status=200,
            response=json.dumps(weapon.to_dict()),
            mimetype='application/json'
        )
    except ValueError as e:
        response = app.response_class(
            response=str(e),
            status=404
        )
    return response


@app.route('/weaponwarehouse/weapons/all', methods=['GET'])
def get_all_weapon():
    """ Get all weapons from the WeaponManager """
    try:
        weapons = my_weapon_warehouse.get_all()
        weapons_temp = []
        for weapon in weapons:
            weapons_temp.append(json.dumps(weapon.to_dict()))
        if weapons is None:
            raise ValueError("Get all weapons failed")
        response = app.response_class(
            status=200,
            response=weapons_temp,
            mimetype='application/json'
        )
    except ValueError as e:
        response = app.response_class(
            response=str(e),
            status=404
        )
    return response


@app.route('/weaponwarehouse/weapons/all/<type>', methods=['GET'])
def get_weapons_by_type(type):
    """ Get all weapons by their type """
    try:
        weapons = my_weapon_warehouse.get_all_by_type(type)
        weapons_temp = []
        for weapon in weapons:
            weapons_temp.append(json.dumps(weapon.to_dict()))
        response = app.response_class(
            status=200,
            response=weapons_temp,
            mimetype='application/json'
        )
    except ValueError as e:
        response = app.response_class(
            response=str(e),
            status=404
        )
    return response


@app.route('/weaponwarehouse/weapons/stats', methods=['GET'])
def get_weapons_stats():
    """ Get the Weapon Stats for the WeaponManager """
    try:
        report = my_weapon_warehouse.get_weapons_stats()
        response = app.response_class(
            status=200,
            response=json.dumps(report.to_dict()),
            mimetype='application/json'
        )
    except ValueError as e:
        response = app.response_class(
            response=str(e),
            status=404
        )
    return response


@app.route('/weaponwarehouse/weapons/reports/<type>', methods=['GET'])
def get_weapons_report(type):
    """ Get all weapons usage report from the WeaponManager """
    try:
        desc = my_weapon_warehouse.get_weapons_reports(type)
        response = app.response_class(
            status=200,
            response=json.dumps(desc),
            mimetype='application/json'
        )
    except ValueError as e:
        response = app.response_class(
            response=str(e),
            status=404
        )
    return response


@app.route('/weaponwarehouse/weapons/retire', methods=['PUT'])
def complete_repair():
    """ Complete a Phone or Tablet repair in the RepairManager for a given cost based on the Serial Number """
    content = request.json
    try:
        my_weapon_warehouse.set_retire(content["id"], datetime.strptime(content["retired_date"], "%Y-%m-%d"),)
        response = app.response_class(
            status=200,
            response="Success",
            mimetype='application/json'
        )
    except ValueError as e:
        response = app.response_class(
            response=str(e),
            status=404
        )
    return response


if __name__ == "__main__":
    app.run()
